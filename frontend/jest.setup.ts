import '@testing-library/jest-dom';
import 'whatwg-fetch';

import fetchMock from 'jest-fetch-mock';
fetchMock.enableMocks();

import { TextEncoder, TextDecoder } from 'util';
Object.defineProperty(global, 'TextEncoder', { value: TextEncoder });
Object.defineProperty(global, 'TextDecoder', { value: TextDecoder });