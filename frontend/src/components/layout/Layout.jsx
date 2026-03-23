import Sidebar from './Sidebar';

export default function Layout({ children, appState, documentCount, lastIndexed, onReindex, onEditFolders }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        appState={appState}
        documentCount={documentCount}
        lastIndexed={lastIndexed}
        onReindex={onReindex}
        onEditFolders={onEditFolders}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
