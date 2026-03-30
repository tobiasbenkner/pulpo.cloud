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
	routes.RegisterHooks(app)

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
			if pw := os.Getenv("PB_USER_PASSWORD"); pw != "" {
				users, _ := se.App.FindCollectionByNameOrId("users")
				if users != nil {
					existing, _ := se.App.FindAuthRecordByEmail(users, email)
					if existing == nil {
						rec := core.NewRecord(users)
						rec.SetEmail(email)
						rec.SetPassword(pw)
						rec.Set("name", os.Getenv("PB_USER_NAME"))
						rec.Set("role", "admin")
						_ = se.App.Save(rec)
					}
				}
			}
		}
		return se.Next()
	})

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		// Custom API routes
		routes.RegisterInvoiceRoutes(app, se)
		routes.RegisterCashRegisterRoutes(app, se)
		routes.RegisterReportRoutes(app, se)

		// Launcher auf / servieren
		if launcher, err := fs.Sub(publicFS, "pb_public/launcher"); err == nil {
			se.Router.GET("/{path...}", apis.Static(launcher, true))
		}

		// App-Frontends unter /shop, /agenda, /settings
		for _, name := range []string{"shop", "agenda", "settings"} {
			sub, err := fs.Sub(publicFS, "pb_public/"+name)
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
