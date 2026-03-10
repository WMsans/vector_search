import { useAuth } from '../../hooks/useAuth';
import { Badge } from '../common';
import { DocumentTextIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default function Sidebar({ appState, documentCount, lastIndexed, onReindex }) {
  const { user, logout } = useAuth();

  const getStatusBadge = () => {
    if (appState === 'indexing') {
      return <Badge variant="warning">Indexing...</Badge>;
    }
    if (documentCount > 0) {
      return <Badge variant="success">Indexed ({documentCount} docs)</Badge>;
    }
    return <Badge variant="default">Not indexed</Badge>;
  };

  const formatLastIndexed = (timestamp) => {
    if (!timestamp) return 'Never';
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <DocumentTextIcon className="h-8 w-8 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">Vector Search</h1>
        </div>
      </div>

      <div className="p-6 space-y-6 flex-1">
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Status
          </h3>
          {getStatusBadge()}
          {lastIndexed && (
            <p className="text-xs text-gray-500 mt-2">
              Last indexed: {formatLastIndexed(lastIndexed)}
            </p>
          )}
        </div>

        {documentCount > 0 && appState !== 'indexing' && (
          <div>
            <button
              onClick={onReindex}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Re-index Drive
            </button>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-gray-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-sm font-medium text-blue-600">
              {user?.email?.[0]?.toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full text-sm text-gray-600 hover:text-gray-900 transition-colors text-left"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
