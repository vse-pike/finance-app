package tui

import (
	"context"
	"fmt"
	"strings"

	"github.com/charmbracelet/bubbles/table"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/jackc/pgx/v5/pgxpool"
)

var kindLabels = map[string]string{
	"real_estate": "Недвижимость",
	"crypto":      "Крипта",
	"cash":        "Наличные",
	"deposit":     "Депозит",
	"commodity":   "Коммодити",
	"securities":  "Бумаги",
}

var valuationLabels = map[string]string{
	"market":   "по рынку",
	"invested": "по вложениям",
	"manual":   "вручную",
}

type Model struct {
	pool  *pgxpool.Pool
	table table.Model
	err   error
}

func New(ctx context.Context, pool *pgxpool.Pool) Model {
	m := Model{pool: pool}
	m.reload(ctx)
	return m
}

func (m Model) Init() tea.Cmd { return nil }

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "q", "ctrl+c":
			return m, tea.Quit
		case "r":
			m.reload(context.Background())
			return m, nil
		}
	}
	m.table, _ = m.table.Update(msg)
	return m, nil
}

func (m Model) View() string {
	if m.err != nil {
		return fmt.Sprintf("Ошибка: %v\n\nq — выход, r — обновить", m.err)
	}
	var b strings.Builder
	b.WriteString(lipgloss.NewStyle().Bold(true).Render("Активы"))
	b.WriteString("\n\n")
	b.WriteString(m.table.View())
	b.WriteString("\n\nq — выход · r — обновить")
	return b.String()
}

func (m *Model) reload(ctx context.Context) {
	rows, err := m.pool.Query(ctx, `
		select name, kind, unit, qty, invested, quote_currency, is_active
		from asset_summary
		order by is_active desc, opened_on desc, name
	`)
	if err != nil {
		m.err = err
		return
	}
	defer rows.Close()

	type asset struct {
		name      string
		kind      string
		unit      string
		qty       string
		invested  string
		currency  string
		valuation string
		active    bool
	}
	var assets []asset
	for rows.Next() {
		var a asset
		if err := rows.Scan(&a.name, &a.kind, &a.unit, &a.qty, &a.invested, &a.currency, &a.valuation, &a.active); err != nil {
			m.err = err
			return
		}
		assets = append(assets, a)
	}
	if err := rows.Err(); err != nil {
		m.err = err
		return
	}
	m.err = nil

	columns := []table.Column{
		{Title: "Актив", Width: 28},
		{Title: "Тип", Width: 14},
		{Title: "Количество", Width: 16},
		{Title: "Вложено", Width: 18},
		{Title: "Метод", Width: 14},
	}
	tableRows := make([]table.Row, 0, len(assets))
	for _, a := range assets {
		name := a.name
		if !a.active {
			name += " (закрыт)"
		}
		tableRows = append(tableRows, table.Row{
			name,
			kindLabel(a.kind),
			fmt.Sprintf("%s %s", a.qty, a.unit),
			fmt.Sprintf("%s %s", a.invested, a.currency),
			valuationLabel(a.valuation),
		})
	}
	m.table = table.New(
		table.WithColumns(columns),
		table.WithRows(tableRows),
		table.WithFocused(true),
		table.WithHeight(len(tableRows)+1),
	)
}

func kindLabel(kind string) string {
	if label, ok := kindLabels[kind]; ok {
		return label
	}
	return kind
}

func valuationLabel(valuation string) string {
	if label, ok := valuationLabels[valuation]; ok {
		return label
	}
	return valuation
}
