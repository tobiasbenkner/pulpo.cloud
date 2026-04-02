package migrations

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"os"
	"time"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

type seedTable struct {
	Label    string
	Seats    int
	MinSeats int
	MaxSeats int
	X        float64
	Y        float64
	Shape    string
	Rotation int
	Width    int
}

type seedGroup struct {
	Label  string
	Tables []int // indices into seedTables
	Sort   int
	Color  string
}

type seedTurn struct {
	Label    string
	Start    string
	Duration int
	Buffer   int
	Color    string
}

var seedZones = []string{"Interior"}

var seedTables = []seedTable{
	{"Mesa 1", 4, 1, 4, 60.61, 89.29, "rect", 0, 2},
	{"Mesa 2", 4, 1, 4, 60.27, 76.57, "rect", 0, 2},
	{"Mesa 3", 4, 1, 4, 60.10, 63.04, "rect", 0, 2},
	{"Mesa 4", 4, 1, 4, 59.76, 49.84, "rect", 0, 2},
	{"Mesa 5", 4, 1, 4, 59.93, 33.74, "rect", 90, 2},
	{"Mesa 6", 4, 1, 4, 59.76, 19.24, "rect", 0, 2},
	{"Mesa 7", 4, 1, 4, 59.65, 6.54, "rect", 0, 2},
	{"Mesa 8", 2, 1, 2, 28.78, 33.25, "rect", 0, 1},
	{"Mesa 9", 2, 1, 2, 28.50, 47.58, "rect", 0, 1},
	{"Mesa 10", 2, 1, 2, 29.31, 19.24, "rect", 0, 1},
	{"Mesa 11", 4, 1, 4, 29.71, 6.70, "rect", 0, 2},
}

var seedTurns = []seedTurn{
	{"Turno 1", "13:00", 90, 15, "#0055ff"},
	{"Turno 2", "15:00", 90, 15, "#00b365"},
	{"Turno 3", "20:00", 90, 15, "#cc2d05"},
	{"Turno 4", "22:00", 90, 15, "#980ed8"},
}

type seedReservation struct {
	Name     string
	Pax      int
	Time     string // HH:MM
	Contact  string
	Notes    string
	Duration int
	Tables   []int // indices into seedTables, -1 = no fixed table
}

var seedNames = []string{
	"García", "Rodríguez", "Martínez", "López", "Hernández",
	"González", "Pérez", "Sánchez", "Ramírez", "Torres",
	"Flores", "Rivera", "Gómez", "Díaz", "Cruz",
	"Morales", "Ortiz", "Gutiérrez", "Chávez", "Reyes",
	"Ruiz", "Álvarez", "Mendoza", "Castillo", "Romero",
	"Jiménez", "Vargas", "Navarro", "Ramos", "Delgado",
}

var seedContacts = []string{
	"600 000 001", "600 000 002", "600 000 003", "600 000 004",
	"600 000 005", "600 000 006", "600 000 007", "600 000 008",
	"", "", "", "", // some without contact
}

var seedNotes = []string{
	"", "", "", "", "", // most without notes
	"Cumpleaños", "Alergia gluten", "Trona para bebé",
	"Mesa junto a ventana", "Aniversario", "Celíaco",
	"Vegetariano", "Llegan tarde 15min",
}

var seedGroups = []seedGroup{
	{"Grupo 1", []int{10, 6}, 0, "#f59e0b"},      // Mesa 11 + Mesa 7
	{"Grupo 2", []int{6, 5}, 1, "#84cc16"},       // Mesa 7 + Mesa 6
	{"Grupo 3", []int{1, 2, 3, 0}, 2, "#ec4899"}, // Mesa 2 + Mesa 3 + Mesa 4 + Mesa 1
	{"Grupo 4", []int{1, 2, 0}, 3, "#b37a00"},    // Mesa 2 + Mesa 3 + Mesa 1
	{"Grupo 5", []int{3, 2}, 4, "#0ea5e9"},       // Mesa 4 + Mesa 3
	{"Grupo 6", []int{1, 0}, 6, "#f97316"},       // Mesa 2 + Mesa 1
}

func init() {
	m.Register(func(app core.App) error {
		if os.Getenv("PB_SEED_DEMO") != "true" {
			return nil
		}

		// Skip if zones already exist
		existing, _ := app.FindFirstRecordByFilter("reservations_zones", "id != ''")
		if existing != nil {
			return nil
		}

		// --- Zones ---
		zoneCol, err := app.FindCollectionByNameOrId("reservations_zones")
		if err != nil {
			return fmt.Errorf("collection reservations_zones not found: %w", err)
		}

		zoneIDs := make([]string, len(seedZones))
		for i, label := range seedZones {
			rec := core.NewRecord(zoneCol)
			rec.Set("label", label)
			rec.Set("sort", i)
			if err := app.Save(rec); err != nil {
				return fmt.Errorf("failed to create zone %s: %w", label, err)
			}
			zoneIDs[i] = rec.Id
		}

		// --- Tables (all in first zone) ---
		tableCol, err := app.FindCollectionByNameOrId("reservations_tables")
		if err != nil {
			return fmt.Errorf("collection reservations_tables not found: %w", err)
		}

		tableIDs := make([]string, len(seedTables))
		for i, t := range seedTables {
			rec := core.NewRecord(tableCol)
			rec.Set("label", t.Label)
			rec.Set("seats", t.Seats)
			rec.Set("min_seats", t.MinSeats)
			rec.Set("max_seats", t.MaxSeats)
			rec.Set("x", t.X)
			rec.Set("y", t.Y)
			rec.Set("shape", t.Shape)
			rec.Set("rotation", t.Rotation)
			rec.Set("width", t.Width)
			rec.Set("zone", zoneIDs[0])
			if err := app.Save(rec); err != nil {
				return fmt.Errorf("failed to create table %s: %w", t.Label, err)
			}
			tableIDs[i] = rec.Id
		}

		// --- Groups ---
		groupCol, err := app.FindCollectionByNameOrId("reservations_table_groups")
		if err != nil {
			return fmt.Errorf("collection reservations_table_groups not found: %w", err)
		}

		for _, g := range seedGroups {
			ids := make([]string, len(g.Tables))
			for j, idx := range g.Tables {
				ids[j] = tableIDs[idx]
			}
			tablesJSON, _ := json.Marshal(ids)

			rec := core.NewRecord(groupCol)
			rec.Set("label", g.Label)
			rec.Set("tables", string(tablesJSON))
			rec.Set("zone", zoneIDs[0])
			rec.Set("sort", g.Sort)
			rec.Set("color", g.Color)
			if err := app.Save(rec); err != nil {
				return fmt.Errorf("failed to create group %s: %w", g.Label, err)
			}
		}

		// --- Turns ---
		turnCol, err := app.FindCollectionByNameOrId("reservations_turns")
		if err != nil {
			return fmt.Errorf("collection reservations_turns not found: %w", err)
		}

		for _, t := range seedTurns {
			rec := core.NewRecord(turnCol)
			rec.Set("label", t.Label)
			rec.Set("start", t.Start)
			rec.Set("duration", t.Duration)
			rec.Set("buffer", t.Buffer)
			rec.Set("color", t.Color)
			if err := app.Save(rec); err != nil {
				return fmt.Errorf("failed to create turn %s: %w", t.Label, err)
			}
		}

		// --- Reservations (14 days from today) ---
		resCol, err := app.FindCollectionByNameOrId("reservations")
		if err != nil {
			return fmt.Errorf("collection reservations not found: %w", err)
		}

		rng := rand.New(rand.NewSource(42))
		today := time.Now()

		// Turn times with typical pax ranges
		turnSlots := []struct {
			times  []string
			minPax int
			maxPax int
		}{
			{[]string{"13:00", "13:15", "13:30"}, 2, 5},
			{[]string{"15:00", "15:15", "15:30"}, 2, 4},
			{[]string{"20:00", "20:15", "20:30"}, 2, 6},
			{[]string{"22:00", "22:15", "22:30"}, 2, 4},
		}

		// Notes for large groups
		largeGroupNotes := []string{
			"Cumpleaños", "Cena de empresa", "Celebración",
			"Despedida", "Reunión familiar", "Aniversario",
		}

		for dayOffset := -14; dayOffset < 14; dayOffset++ {
			day := today.AddDate(0, 0, dayOffset)
			dateStr := day.Format("2006-01-02")
			isSunday := day.Weekday() == time.Sunday

			for turnIdx, turn := range turnSlots {
				// Number of reservations per turn
				var count int
				if isSunday {
					if turnIdx >= 2 { // no dinner on Sunday
						continue
					}
					count = 1 + rng.Intn(2) // 1-2
				} else if turnIdx == 1 || turnIdx == 3 { // smaller turns
					count = 1 + rng.Intn(2) // 1-2
				} else { // main turns
					count = 2 + rng.Intn(3) // 2-4
				}

				for i := 0; i < count; i++ {
					name := seedNames[rng.Intn(len(seedNames))]
					pax := turn.minPax + rng.Intn(turn.maxPax-turn.minPax+1)
					timeStr := turn.times[rng.Intn(len(turn.times))]
					contact := seedContacts[rng.Intn(len(seedContacts))]
					notes := seedNotes[rng.Intn(len(seedNotes))]
					duration := 90

					// ~15% chance of a large group (8-12 pax) in main turns
					if (turnIdx == 0 || turnIdx == 2) && rng.Float64() < 0.15 {
						pax = 8 + rng.Intn(5) // 8-12
						duration = 120
						notes = largeGroupNotes[rng.Intn(len(largeGroupNotes))]
						if contact == "" {
							contact = seedContacts[rng.Intn(8)] // ensure contact for large groups
						}
					}

					// Past reservations: all arrived. Today's past turns: ~80% arrived.
					arrived := false
					if dayOffset < 0 {
						arrived = true
					} else if dayOffset == 0 {
						h := time.Now().Hour()
						turnHour := 13
						if turnIdx == 1 {
							turnHour = 15
						} else if turnIdx == 2 {
							turnHour = 20
						} else if turnIdx == 3 {
							turnHour = 22
						}
						if h >= turnHour {
							arrived = rng.Float64() < 0.8
						}
					}

					rec := core.NewRecord(resCol)
					rec.Set("date", dateStr)
					rec.Set("time", timeStr)
					rec.Set("name", name)
					rec.Set("person_count", fmt.Sprintf("%d", pax))
					rec.Set("contact", contact)
					rec.Set("notes", notes)
					rec.Set("arrived", arrived)
					rec.Set("duration", duration)
					if err := app.Save(rec); err != nil {
						return fmt.Errorf("failed to create reservation: %w", err)
					}
				}
			}
		}

		return nil
	}, nil)
}
