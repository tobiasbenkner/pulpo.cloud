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
		plan := e.Record.GetString("plan")
		migration := e.Record.GetBool("migration")

		migrationText := "Nein"
		if migration {
			migrationText = "Ja"
		}

		msg := &mailer.Message{
			From:    mail.Address{Name: "Pulpo Cloud", Address: "noreply@pulpo.cloud"},
			To:      []mail.Address{{Address: "info@pulpo.cloud"}},
			Subject: fmt.Sprintf("Neue Registrierung: %s", userEmail),
			Text:    fmt.Sprintf("Ein neuer Benutzer hat sich registriert:\n\nE-Mail: %s\nPlan: %s\nMigration: %s", userEmail, plan, migrationText),
		}

		if err := app.NewMailClient().Send(msg); err != nil {
			app.Logger().Error("failed to send registration notification", "error", err, "user", userEmail)
		}

		return e.Next()
	})

	app.OnMailerRecordVerificationSend("users").BindFunc(func(e *core.MailerRecordEvent) error {
		lang := e.Record.GetString("lang")
		token, _ := e.Meta["token"].(string)
		appURL := e.App.Settings().Meta.AppURL
		subject, body := verificationEmail(lang, appURL, token)
		e.Message.Subject = subject
		e.Message.HTML = body
		e.Message.Text = ""
		return e.Next()
	})

	app.OnRecordConfirmVerificationRequest("users").BindFunc(func(e *core.RecordConfirmVerificationRequestEvent) error {
		e.Record.SetVerified(true)
		if err := e.App.Save(e.Record); err != nil {
			return e.BadRequestError("Failed to save verification status.", err)
		}

		token, err := e.Record.NewAuthToken()
		if err != nil {
			return e.InternalServerError("Failed to create auth token.", err)
		}

		return e.JSON(http.StatusOK, map[string]any{
			"token":  token,
			"record": e.Record,
		})
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

type verificationContent struct {
	subject string
	heading string
	text    string
	button  string
	ignore  string
}

var verificationTranslations = map[string]verificationContent{
	"es": {
		subject: "Confirma tu email",
		heading: "Confirma tu dirección de email",
		text:    "Haz clic en el botón de abajo para verificar tu dirección de email.",
		button:  "Confirmar email",
		ignore:  "Si no has creado una cuenta, puedes ignorar este mensaje.",
	},
	"de": {
		subject: "E-Mail bestätigen",
		heading: "Bestätige deine E-Mail-Adresse",
		text:    "Klicke auf den Button, um deine E-Mail-Adresse zu verifizieren.",
		button:  "E-Mail bestätigen",
		ignore:  "Falls du kein Konto erstellt hast, kannst du diese Nachricht ignorieren.",
	},
	"en": {
		subject: "Verify your email",
		heading: "Verify your email address",
		text:    "Click the button below to verify your email address.",
		button:  "Verify email",
		ignore:  "If you didn't create an account, you can ignore this message.",
	},
	"it": {
		subject: "Conferma la tua email",
		heading: "Conferma il tuo indirizzo email",
		text:    "Clicca il pulsante qui sotto per verificare il tuo indirizzo email.",
		button:  "Conferma email",
		ignore:  "Se non hai creato un account, puoi ignorare questo messaggio.",
	},
}

var verifyPaths = map[string]string{
	"es": "/app/verificar",
	"de": "/de/app/verifizieren",
	"en": "/en/app/verify",
	"it": "/it/app/verifica",
}

func verificationEmail(lang string, appURL string, token string) (subject string, html string) {
	t, ok := verificationTranslations[lang]
	if !ok {
		t = verificationTranslations["es"]
	}

	verifyPath, ok := verifyPaths[lang]
	if !ok {
		verifyPath = verifyPaths["es"]
	}

	html = fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="440" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden">
        <tr><td style="background:#0f1a2e;padding:24px;text-align:center">
          <span style="color:#fff;font-size:20px;font-weight:700">Pulpo</span>
        </td></tr>
        <tr><td style="padding:32px 28px">
          <h1 style="margin:0 0 12px;font-size:18px;color:#0f1a2e">%s</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.5">%s</p>
          <table cellpadding="0" cellspacing="0" width="100%%"><tr><td align="center">
            <a href="%s%s?token=%s"
               style="display:inline-block;background:#e8546d;color:#fff;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:600;text-decoration:none">
              %s
            </a>
          </td></tr></table>
          <p style="margin:24px 0 0;font-size:12px;color:#94a3b8">%s</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`, t.heading, t.text, appURL, verifyPath, token, t.button, t.ignore)

	return t.subject, html
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
