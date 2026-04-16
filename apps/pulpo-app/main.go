package main

import (
	"embed"
	"io/fs"
	"log"
	"os"

	"github.com/joho/godotenv"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"
	"github.com/pocketbase/pocketbase/tools/osutils"
	"github.com/pocketbase/pocketbase/tools/security"

	"github.com/pulpo-cloud/pulpo-app/hooks"
	_ "github.com/pulpo-cloud/pulpo-app/migrations"
	"github.com/pulpo-cloud/pulpo-app/routes"
)

var (
	version = "dev"
	commit  = "none"
)

//go:embed all:pb_public
var publicFS embed.FS

func main() {
	// Load .env if present (ignored in production if file doesn't exist)
	_ = godotenv.Load()

	// Doppelklick ohne Argumente → automatisch "serve" starten
	if len(os.Args) == 1 {
		os.Args = append(os.Args, "serve", "--http=0.0.0.0:8090")
	}

	app := pocketbase.NewWithConfig(pocketbase.Config{
		DefaultDataDir:  "pb_data",
		DefaultDev:      version == "dev",
		HideStartBanner: false,
	})

	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		Automigrate: osutils.IsProbablyGoRun(),
	})

	// Hooks (react to record changes)
	hooks.Register(app)

	// Create superuser + app user from env vars
	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		if email := os.Getenv("PB_ADMIN_EMAIL"); email != "" {
			if pw := os.Getenv("PB_ADMIN_PASSWORD"); pw != "" {
				superusers, _ := se.App.FindCollectionByNameOrId(core.CollectionNameSuperusers)
				if superusers != nil {
					existing, _ := se.App.FindAuthRecordByEmail(superusers, email)
					if existing == nil {
						rec := core.NewRecord(superusers)
						rec.SetEmail(email)
						rec.SetPassword(pw)
						_ = se.App.Save(rec)
					}
				}
			}
		}
		if email := os.Getenv("PB_USER_EMAIL"); email != "" {
			hash := os.Getenv("PB_USER_PASSWORD_HASH")
			tokenKey := os.Getenv("PB_USER_TOKEN_KEY")
			pw := os.Getenv("PB_USER_PASSWORD")
			users, _ := se.App.FindCollectionByNameOrId("users")
			if users != nil {
				existing, _ := se.App.FindAuthRecordByEmail(users, email)
				if existing == nil {
					rec := core.NewRecord(users)
					rec.SetEmail(email)
					rec.Set("name", os.Getenv("PB_USER_NAME"))
					rec.Set("role", "admin")
					rec.SetVerified(true)
					if hash != "" && tokenKey != "" {
						// Copy auth from another PocketBase instance — both hash + tokenKey via raw SQL
						rec.SetPassword(security.RandomString(30))
						if err := se.App.Save(rec); err == nil {
							_, _ = se.App.DB().NewQuery("UPDATE users SET password = {:hash}, tokenKey = {:tokenKey} WHERE id = {:id}").
								Bind(map[string]any{"hash": hash, "tokenKey": tokenKey, "id": rec.Id}).Execute()
						}
					} else if pw != "" {
						rec.SetPassword(pw)
						_ = se.App.Save(rec)
					}
				}
			}
		}
		return se.Next()
	})

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		// Version endpoint (public, no auth)
		se.Router.GET("/api/version", func(e *core.RequestEvent) error {
			return e.JSON(200, map[string]string{
				"version": version,
				"commit":  commit,
			})
		})

		// Custom API routes
		routes.RegisterInvoiceRoutes(app, se)
		routes.RegisterCashRegisterRoutes(app, se)
		routes.RegisterReportRoutes(app, se)

		// In sim mode (PULPO_SIM_MODE=1) serve pb_public from disk so that
		// rebuilt frontends are picked up without restarting the Go binary.
		// Otherwise use the go:embed snapshot baked into the binary.
		var pbRoot fs.FS
		if os.Getenv("PULPO_SIM_MODE") == "1" {
			pbRoot = os.DirFS("pb_public")
			log.Println("pb_public: serving from disk (sim mode)")
		} else {
			sub, err := fs.Sub(publicFS, "pb_public")
			if err != nil {
				return err
			}
			pbRoot = sub
		}

		// Menu auf / servieren (Default-App)
		// Uses custom handler to inject OG meta tags for link previews
		if menu, err := fs.Sub(pbRoot, "menu"); err == nil {
			se.Router.GET("/{path...}", routes.MenuHandler(app, menu))
		}

		// Launcher unter /apps servieren
		if launcher, err := fs.Sub(pbRoot, "launcher"); err == nil {
			se.Router.GET("/apps/{path...}", apis.Static(launcher, true))
		}

		// App-Frontends unter /shop, /agenda, /admin
		for _, name := range []string{"shop", "agenda", "admin"} {
			sub, err := fs.Sub(pbRoot, name)
			if err != nil {
				continue
			}
			se.Router.GET("/"+name+"/{path...}", apis.Static(sub, true))
		}

		return se.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
