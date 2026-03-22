package main

import (
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"net/mail"
	"strings"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"
	"github.com/pocketbase/pocketbase/tools/mailer"
	"github.com/pocketbase/pocketbase/tools/osutils"

	_ "github.com/pulpocloud/landingpage/migrations"
)

//go:embed pb_public/*
var publicFS embed.FS

func main() {
	app := pocketbase.New()

	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		Automigrate: osutils.IsProbablyGoRun(),
	})

	app.OnRecordAfterCreateSuccess("users").BindFunc(func(e *core.RecordEvent) error {
		userEmail := e.Record.GetString("email")

		msg := &mailer.Message{
			From:    mail.Address{Name: "Pulpo Cloud", Address: "noreply@pulpo.cloud"},
			To:      []mail.Address{{Address: "info@pulpo.cloud"}},
			Subject: fmt.Sprintf("Neue Registrierung: %s", userEmail),
			Text:    fmt.Sprintf("Ein neuer Benutzer hat sich registriert:\n\nE-Mail: %s", userEmail),
		}

		if err := app.NewMailClient().Send(msg); err != nil {
			app.Logger().Error("failed to send registration notification", "error", err, "user", userEmail)
		}

		return e.Next()
	})

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		sub, err := fs.Sub(publicFS, "pb_public")
		if err != nil {
			return err
		}

		fileServer := http.FileServerFS(sub)

		se.Router.GET("/{path...}", func(e *core.RequestEvent) error {
			path := e.Request.URL.Path

			if strings.HasPrefix(path, "/api/") || strings.HasPrefix(path, "/_/") {
				return e.Next()
			}

			iw := &interceptWriter{ResponseWriter: e.Response, status: 200}
			fileServer.ServeHTTP(iw, e.Request)

			if iw.status == http.StatusNotFound {
				http.Redirect(e.Response, e.Request, "/", http.StatusTemporaryRedirect)
			}

			return nil
		})

		return se.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

type interceptWriter struct {
	http.ResponseWriter
	status      int
	wroteHeader bool
}

func (w *interceptWriter) WriteHeader(code int) {
	w.status = code
	w.wroteHeader = true
	if code != http.StatusNotFound {
		w.ResponseWriter.WriteHeader(code)
	}
}

func (w *interceptWriter) Write(b []byte) (int, error) {
	if w.status == http.StatusNotFound {
		return len(b), nil
	}
	return w.ResponseWriter.Write(b)
}
