import { test, expect, describe, mock, afterEach } from 'bun:test';
import React from 'react';
import { render, screen, act, cleanup } from '@testing-library/react';
import { MessageBox } from '../../renderer/components/message';

describe('MessageBox', () => {
  afterEach(cleanup);

  test('renders success message when successInfo is set', () => {
    render(
      <MessageBox successInfo="Copied!" setSuccessInfo={() => {}} />
    );
    expect(screen.getByText('Copied!')).toBeTruthy();
  });

  test('does not render when successInfo is empty', () => {
    render(
      <MessageBox successInfo="" setSuccessInfo={() => {}} />
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });

  test('renders error message when errorInfo is set', () => {
    render(
      <MessageBox
        successInfo=""
        setSuccessInfo={() => {}}
        errorInfo="Something went wrong"
        setErrorInfo={() => {}}
      />
    );
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });

  test('calls setSuccessInfo with empty string on close', () => {
    const setSuccessInfo = mock(() => {});
    render(
      <MessageBox successInfo="Done" setSuccessInfo={setSuccessInfo} />
    );

    // Click the close button on the Alert
    const closeButton = screen.getByRole('button');
    act(() => closeButton.click());

    expect(setSuccessInfo).toHaveBeenCalledWith('');
  });
});
