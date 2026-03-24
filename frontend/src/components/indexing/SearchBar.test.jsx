import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SearchBar from './SearchBar';

vi.mock('../../services/drive', () => ({
  searchDrive: vi.fn(),
}));

import { searchDrive } from '../../services/drive';

describe('SearchBar', () => {
  const defaultProps = {
    accessToken: 'test-token',
    extensions: ['docx'],
    onSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders search input', () => {
    render(<SearchBar {...defaultProps} />);
    expect(screen.getByPlaceholderText(/search drive/i)).toBeInTheDocument();
  });

  it('calls searchDrive after debounce', async () => {
    searchDrive.mockResolvedValueOnce({ files: [] });
    
    render(<SearchBar {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText(/search drive/i), { target: { value: 'test' } });
    
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    
    expect(searchDrive).toHaveBeenCalledWith('test-token', 'test', ['docx']);
  });

  it('displays search results', async () => {
    const mockFile = { id: '1', name: 'report.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
    searchDrive.mockResolvedValueOnce({ files: [mockFile] });
    
    render(<SearchBar {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText(/search drive/i), { target: { value: 'report' } });
    
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    
    expect(screen.getByText('report.docx')).toBeInTheDocument();
  });

  it('calls onSelect and clears search on result click', async () => {
    const mockFile = { id: '1', name: 'report.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
    searchDrive.mockResolvedValueOnce({ files: [mockFile] });
    const onSelect = vi.fn();
    
    render(<SearchBar {...defaultProps} onSelect={onSelect} />);
    fireEvent.change(screen.getByPlaceholderText(/search drive/i), { target: { value: 'report' } });
    
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    
    fireEvent.click(screen.getByText('report.docx'));
    
    expect(onSelect).toHaveBeenCalledWith(mockFile);
    expect(screen.getByPlaceholderText(/search drive/i).value).toBe('');
  });

  it('shows no results message', async () => {
    searchDrive.mockResolvedValueOnce({ files: [] });
    
    render(<SearchBar {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText(/search drive/i), { target: { value: 'xyz' } });
    
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    
    expect(screen.getByText(/no files found/i)).toBeInTheDocument();
  });

  it('shows error message on API failure', async () => {
    searchDrive.mockRejectedValueOnce(new Error('API error'));
    
    render(<SearchBar {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText(/search drive/i), { target: { value: 'test' } });
    
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    
    expect(screen.getByText(/search failed/i)).toBeInTheDocument();
  });

  it('does not search on empty input', async () => {
    render(<SearchBar {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText(/search drive/i), { target: { value: '' } });
    
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    
    expect(searchDrive).not.toHaveBeenCalled();
  });
});
