import { Search } from 'lucide-react';
import { materialCategories, DATA_STATUS } from '../../data/index.js';

export default function MaterialFilters({ query, onQuery, category, onCategory, status, onStatus, count }) {
  return (
    <div className="filters" role="search">
      <div className="filters__search">
        <label htmlFor="material-search" className="visually-hidden">Buscar material</label>
        <Search aria-hidden="true" size={17} className="filters__icon" />
        <input
          id="material-search"
          type="search"
          className="input"
          placeholder="Buscar por nombre o fuente…"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
        />
      </div>
      <fieldset className="chips">
        <legend className="visually-hidden">Categoría</legend>
        {[{ id: 'all', label: 'Todas' }, ...materialCategories, { id: 'user', label: 'Mis materiales' }].map((c) => (
          <label key={c.id} className={`chip ${category === c.id ? 'chip--active' : ''}`}>
            <input type="radio" name="category" value={c.id} checked={category === c.id} onChange={() => onCategory(c.id)} />
            {c.label}
          </label>
        ))}
      </fieldset>
      <div className="filters__row">
        <label htmlFor="status-filter" className="small muted">Calidad del dato</label>
        <select id="status-filter" className="input select input--sm" value={status} onChange={(e) => onStatus(e.target.value)}>
          <option value="all">Todas</option>
          {Object.entries(DATA_STATUS).map(([id, s]) => <option key={id} value={id}>{s.label}</option>)}
        </select>
        <p className="small muted filters__count" aria-live="polite">{count} {count === 1 ? 'material' : 'materiales'}</p>
      </div>
    </div>
  );
}
