package routes

import (
	"log"

	"github.com/pocketbase/pocketbase/core"
)

// RegisterHooks registers all PocketBase record hooks.
func RegisterHooks(app core.App) {
	// Send closure email when a closure is updated to "closed"
	app.OnRecordAfterUpdateSuccess("closures").BindFunc(func(e *core.RecordEvent) error {
		record := e.Record
		original := record.Original()

		// Only trigger when status changes to "closed"
		if record.GetString("status") != "closed" || original.GetString("status") == "closed" {
			return e.Next()
		}

		closureID := record.Id

		go func() {
			summary, err := ComputeClosureSummary(e.App, closureID)
			if err != nil {
				log.Printf("Hook: failed to compute closure summary for email: %v", err)
				return
			}

			if err := sendClosureEmailSync(e.App, closureID, summary); err != nil {
				log.Printf("Hook: failed to send closure email: %v", err)
			}
		}()

		return e.Next()
	})
}
