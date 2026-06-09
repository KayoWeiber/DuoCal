export function getMonthGridDays(mesVisivel: Date): Date[] {
  const primeiroDiaMes = new Date(
    mesVisivel.getFullYear(),
    mesVisivel.getMonth(),
    1,
  )
  const inicioGrade = new Date(primeiroDiaMes)
  inicioGrade.setDate(primeiroDiaMes.getDate() - primeiroDiaMes.getDay())

  return Array.from({ length: 42 }, (_value, index) => {
    const dia = new Date(inicioGrade)
    dia.setDate(inicioGrade.getDate() + index)
    return dia
  })
}

export function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

export function firstDayOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}
