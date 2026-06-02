export function PdfViewer({ url }: { url: string }) {
  return (
    <iframe
      src={url}
      style={{
        width: '100%',
        height: 620,
        border: 'none',
        background: '#fff',
      }}
    />
  );
}
