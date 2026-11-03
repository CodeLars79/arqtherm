import { Layers, Plus } from 'lucide-react';
import LayerRow from './LayerRow.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import Button from '../ui/Button.jsx';

export default function LayerList({ assembly, calculation, materialsById, actions }) {
  const results = new Map(calculation.layers.map((l) => [l.id, l]));
  const count = assembly.layers.length;

  if (count === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="Sin capas"
        action={<Button variant="primary" icon={Plus} onClick={actions.addLayer}>Añadir la primera capa</Button>}
      >
        Añada las capas del elemento ordenadas del exterior al interior.
      </EmptyState>
    );
  }

  return (
    <ol className="layer-list" aria-label="Capas, del exterior al interior">
      {assembly.layers.map((layer, index) => (
        <LayerRow
          key={layer.id}
          layer={layer}
          index={index}
          count={count}
          result={results.get(layer.id)}
          material={materialsById[layer.materialId]}
          actions={actions}
          position={index === 0 ? 'exterior' : index === count - 1 ? 'interior' : null}
        />
      ))}
    </ol>
  );
}
