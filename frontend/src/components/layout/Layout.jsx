import Sidebar from './Sidebar';

export default function Layout({ children, appState, documentCount, lastIndexed, onReindex }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        appState={appState}
        documentCount={documentCount}
        lastIndexed={lastIndexed}
        onReindex={onReindex}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
