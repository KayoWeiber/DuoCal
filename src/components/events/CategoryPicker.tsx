import type { CategoriaEvento } from '../../hooks'

type CategoryPickerProps = {
  categorias: CategoriaEvento[]
  value: string
  onChange: (id: string) => void
}

export function CategoryPicker({ categorias, value, onChange }: CategoryPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {categorias.map((cat) => {
        const selected = cat.id === value

        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onChange(selected ? '' : cat.id)}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
            style={{
              backgroundColor: cat.cd_cor + (selected ? '22' : '14'),
              color: cat.cd_cor,
              border: selected
                ? `2px solid ${cat.cd_cor}55`
                : '2px solid transparent',
              opacity: selected ? 1 : 0.78,
            }}
          >
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: cat.cd_cor }}
            />
            {cat.nm_categoria}
          </button>
        )
      })}
    </div>
  )
}
