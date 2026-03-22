package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("_pb_users_auth_")
		if err != nil {
			return err
		}

		// plan (text)
		if err := collection.Fields.AddMarshaledJSONAt(16, []byte(`{
			"autogeneratePattern": "",
			"hidden": false,
			"id": "select2847584910",
			"max": 0,
			"min": 0,
			"name": "plan",
			"pattern": "",
			"presentable": false,
			"primaryKey": false,
			"required": false,
			"system": false,
			"type": "text"
		}`)); err != nil {
			return err
		}

		// migration (boolean)
		if err := collection.Fields.AddMarshaledJSONAt(17, []byte(`{
			"hidden": false,
			"id": "bool3948571620",
			"name": "migration",
			"presentable": false,
			"required": false,
			"system": false,
			"type": "bool"
		}`)); err != nil {
			return err
		}

		// notes (text)
		if err := collection.Fields.AddMarshaledJSONAt(18, []byte(`{
			"autogeneratePattern": "",
			"hidden": false,
			"id": "text4829175630",
			"max": 0,
			"min": 0,
			"name": "notes",
			"pattern": "",
			"presentable": false,
			"primaryKey": false,
			"required": false,
			"system": false,
			"type": "text"
		}`)); err != nil {
			return err
		}

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("_pb_users_auth_")
		if err != nil {
			return err
		}

		collection.Fields.RemoveById("select2847584910")
		collection.Fields.RemoveById("bool3948571620")
		collection.Fields.RemoveById("text4829175630")

		return app.Save(collection)
	})
}
