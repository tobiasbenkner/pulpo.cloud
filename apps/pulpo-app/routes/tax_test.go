package routes

import "testing"

func TestTaxZoneName(t *testing.T) {
	tests := []struct {
		postcode string
		want     string
	}{
		// IGIC — Canary Islands
		{"35001", "IGIC"},
		{"35999", "IGIC"},
		{"38001", "IGIC"},
		{"38999", "IGIC"},
		// IPSI — Ceuta / Melilla
		{"51001", "IPSI"},
		{"52001", "IPSI"},
		// IVA — Mainland
		{"28001", "IVA"},
		{"08001", "IVA"},
		{"46001", "IVA"},
		{"01001", "IVA"},
		// Edge cases
		{"", "IVA"},
		{"3", "IVA"},
		{"00000", "IVA"},
	}

	for _, tt := range tests {
		t.Run(tt.postcode, func(t *testing.T) {
			got := TaxZoneName(tt.postcode)
			if got != tt.want {
				t.Errorf("TaxZoneName(%q) = %q, want %q", tt.postcode, got, tt.want)
			}
		})
	}
}
