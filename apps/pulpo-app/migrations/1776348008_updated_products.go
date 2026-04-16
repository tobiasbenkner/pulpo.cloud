package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_4092854851")
		if err != nil {
			return err
		}

		// update field
		if err := collection.Fields.AddMarshaledJSONAt(13, []byte(`{
			"hidden": false,
			"id": "select1744281524",
			"maxSelect": 14,
			"name": "allergens",
			"presentable": false,
			"required": false,
			"system": false,
			"type": "select",
			"values": [
				"gluten",
				"crustaceans",
				"eggs",
				"fish",
				"peanuts",
				"soybeans",
				"milk",
				"nuts",
				"celery",
				"mustard",
				"sesame",
				"sulphites",
				"lupin",
				"molluscs"
			]
		}`)); err != nil {
			return err
		}

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_4092854851")
		if err != nil {
			return err
		}

		// update field
		if err := collection.Fields.AddMarshaledJSONAt(13, []byte(`{
			"hidden": false,
			"id": "select1744281524",
			"maxSelect": 2,
			"name": "allergens",
			"presentable": false,
			"required": false,
			"system": false,
			"type": "select",
			"values": [
				"gluten",
				"crustaceans",
				"eggs",
				"fish",
				"peanuts",
				"soybeans",
				"milk",
				"nuts",
				"celery",
				"mustard",
				"sesame",
				"sulphites",
				"lupin",
				"molluscs"
			]
		}`)); err != nil {
			return err
		}

		return app.Save(collection)
	})
}
