package main

import (
	"embed"
	"io/fs"
	"log"
	"os"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"
	"github.com/pocketbase/pocketbase/tools/osutils"

	_ "github.com/pulpo-cloud/pulpo-app/migrations"
)

var (
	version = "dev"
	commit  = "none"
)

//go:embed all:pb_public
var publicFS embed.FS

func main() {
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

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
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
