import { Badge } from './StatusMessage.jsx';
import { DATA_STATUS } from '../../data/index.js';

const TONES = {
  'reference-verified': 'success',
  'reference-pending-check': 'warning',
  provisional: 'error',
  user: 'info'
};

export default function DataStatusBadge({ status }) {
  const info = DATA_STATUS[status];
  if (!info) return null;
  return <Badge tone={TONES[status] || 'neutral'}>{info.short}</Badge>;
}
