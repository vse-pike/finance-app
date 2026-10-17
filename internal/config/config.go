package config

import "os"

func DatabaseURL() string {
	if url := os.Getenv("FINANCE_DB"); url != "" {
		return url
	}
	return "postgres://finance:finance@127.0.0.1:5432/finance?sslmode=disable"
}
