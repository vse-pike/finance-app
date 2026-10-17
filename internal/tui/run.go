package tui

import (
	"context"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/jackc/pgx/v5/pgxpool"
)

func Run(ctx context.Context, pool *pgxpool.Pool) (tea.Model, error) {
	program := tea.NewProgram(New(ctx, pool), tea.WithAltScreen())
	return program.Run()
}
