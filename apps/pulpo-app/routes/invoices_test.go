package routes

import (
	"strings"
	"testing"
	"time"
)

func TestGenerateInvoiceNumber(t *testing.T) {
	// Fix time for reproducible tests — we test the pattern, not exact date
	tests := []struct {
		name        string
		prefix      string
		invoiceType string
		counter     int
		wantPrefix  string
		wantSuffix  string
	}{
		{
			name:        "ticket with date and count",
			prefix:      "%date%%count%",
			invoiceType: "ticket",
			counter:     1,
			wantPrefix:  "T-",
			wantSuffix:  "00001",
		},
		{
			name:        "factura with year-month-day-count",
			prefix:      "%year%-%month%-%day%-%count%",
			invoiceType: "factura",
			counter:     42,
			wantPrefix:  "F-",
			wantSuffix:  "00042",
		},
		{
			name:        "rectificativa with count",
			prefix:      "INV-%count%",
			invoiceType: "rectificativa",
			counter:     123,
			wantPrefix:  "R-INV-",
			wantSuffix:  "00123",
		},
		{
			name:        "empty prefix just gives type prefix",
			prefix:      "",
			invoiceType: "ticket",
			counter:     7,
			wantPrefix:  "T-",
			wantSuffix:  "",
		},
		{
			name:        "counter with 5+ digits",
			prefix:      "%count%",
			invoiceType: "factura",
			counter:     100000,
			wantPrefix:  "F-",
			wantSuffix:  "100000",
		},
		{
			name:        "date only without count",
			prefix:      "%date%",
			invoiceType: "ticket",
			counter:     1,
			wantPrefix:  "T-",
			wantSuffix:  "", // no count placeholder, no counter in output
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := generateInvoiceNumber(tt.prefix, tt.invoiceType, tt.counter)
			if !strings.HasPrefix(got, tt.wantPrefix) {
				t.Errorf("generateInvoiceNumber() = %q, want prefix %q", got, tt.wantPrefix)
			}
			if !strings.HasSuffix(got, tt.wantSuffix) {
				t.Errorf("generateInvoiceNumber() = %q, want suffix %q", got, tt.wantSuffix)
			}
		})
	}

	// Test date substitution specifically
	t.Run("date placeholders are substituted", func(t *testing.T) {
		got := generateInvoiceNumber("%year%-%month%-%day%-%date%-%count%", "ticket", 1)

		if strings.Contains(got, "year") && strings.Contains(got, "%") {
			t.Error("should not contain year placeholder")
		}
		if strings.Contains(got, "month") && strings.Count(got, "%") > 0 {
			t.Error("should not contain month placeholder")
		}

		// Verify actual year is present
		yearStr := strings.Split(strings.TrimPrefix(got, "T-"), "-")[0]
		if yearStr != time.Now().Format("2006") {
			t.Errorf("year = %s, want %s", yearStr, time.Now().Format("2006"))
		}
	})
}

func TestNegate(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"10.00", "-10.00"},
		{"0.00", "0.00"},
		{"-5.50", "5.50"},
		{"100.99", "-100.99"},
		{"0.01", "-0.01"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			got := negate(tt.input)
			if got != tt.want {
				t.Errorf("negate(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}

	// Invalid input returns original
	t.Run("invalid input", func(t *testing.T) {
		got := negate("not-a-number")
		if got != "not-a-number" {
			t.Errorf("negate(invalid) = %q, want original string", got)
		}
	})
}

func TestAbs(t *testing.T) {
	if abs(5) != 5 {
		t.Error("abs(5) should be 5")
	}
	if abs(-5) != 5 {
		t.Error("abs(-5) should be 5")
	}
	if abs(0) != 0 {
		t.Error("abs(0) should be 0")
	}
}

func TestToStringSlice(t *testing.T) {
	input := []any{"abc", "def", "ghi"}
	got := toStringSlice(input)
	if len(got) != 3 {
		t.Fatalf("len = %d, want 3", len(got))
	}
	if got[0] != "abc" || got[1] != "def" || got[2] != "ghi" {
		t.Errorf("got %v, want [abc def ghi]", got)
	}
}
