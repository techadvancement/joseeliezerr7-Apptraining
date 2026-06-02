export async function openExternal(url: string): Promise<void> {
  window.open(url, '_blank', 'noopener');
}
