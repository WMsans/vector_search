import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./fileExtractors', () => ({
  getMimeTypes: (extensions) => {
    const map = { docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
    return extensions.map(e => map[e]).filter(Boolean);
  },
}));

import { searchDrive } from './drive';

global.fetch = vi.fn();

describe('searchDrive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls Drive API with name contains query', async () => {
    const mockResponse = { files: [{ id: '1', name: 'test.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }] };
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockResponse });

    const result = await searchDrive('test-token', 'test', ['docx']);

    expect(fetch).toHaveBeenCalledTimes(1);
    const url = fetch.mock.calls[0][0];
    const decodedUrl = decodeURIComponent(url);
    expect(decodedUrl).toContain('name contains');
    expect(decodedUrl).toContain('test');
    expect(result).toEqual(mockResponse);
  });

  it('throws on API error', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 500 });

    await expect(searchDrive('token', 'query', ['docx'])).rejects.toThrow('API request failed');
  });
});
