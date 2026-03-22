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

		// remove old select field
		collection.Fields.RemoveById("select4294234269")

		// add as text field
		if err := collection.Fields.AddMarshaledJSONAt(14, []byte(`{
			"autogeneratePattern": "",
			"hidden": false,
			"id": "text4294234269",
			"max": 0,
			"min": 0,
			"name": "businessType",
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

		// revert: remove text field
		collection.Fields.RemoveById("text4294234269")

		// re-add as select field
		if err := collection.Fields.AddMarshaledJSONAt(14, []byte(`{
			"hidden": false,
			"id": "select4294234269",
			"maxSelect": 1,
			"name": "businessType",
			"presentable": false,
			"required": false,
			"system": false,
			"type": "select",
			"values": ["gastro", "retail", "other"]
		}`)); err != nil {
			return err
		}

		return app.Save(collection)
	})
}
