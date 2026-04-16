// Package hooks registers all PocketBase record hooks (pre/post-save reactions).
// These are distinct from routes: they react to record changes rather than
// serving HTTP endpoints.
package hooks

import (
	"log"

	"github.com/pocketbase/pocketbase/core"

	"github.com/pulpo-cloud/pulpo-app/routes"
)

// Register binds every hook to the given app.
func Register(app core.App) {
	registerImageCompressionHook(app)
	registerClosureEmailHook(app)
}

// registerClosureEmailHook sends the closure email (with Excel attachment)
// asynchronously when a closure transitions to status "closed".
func registerClosureEmailHook(app core.App) {
	app.OnRecordAfterUpdateSuccess("closures").BindFunc(func(e *core.RecordEvent) error {
		record := e.Record
		original := record.Original()

		if record.GetString("status") != "closed" || original.GetString("status") == "closed" {
			return e.Next()
		}

		closureID := record.Id

		go func() {
			summary, err := routes.ComputeClosureSummary(e.App, closureID)
			if err != nil {
				log.Printf("Hook: failed to compute closure summary for email: %v", err)
				return
			}

			if err := routes.SendClosureEmail(e.App, closureID, summary); err != nil {
				log.Printf("Hook: failed to send closure email: %v", err)
			}
		}()

		return e.Next()
	})
}
