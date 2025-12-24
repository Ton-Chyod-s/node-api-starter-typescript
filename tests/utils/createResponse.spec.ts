import { createResponse } from '@utils/createResponse';

describe('createResponse', () => {
  it('deve retornar apenas statusCode e message quando data e elapsedTime não forem informados', () => {
    const result = createResponse(200, 'OK');

    expect(result).toEqual({
      statusCode: 200,
      message: 'OK',
    });

    expect(result).not.toHaveProperty('data');
    expect(result).not.toHaveProperty('elapsedTime');
  });

  it('deve incluir data quando for informada', () => {
    const data = { id: '1', name: 'Klay' };

    const result = createResponse(201, 'Created', data);

    expect(result).toEqual({
      statusCode: 201,
      message: 'Created',
      data,
    });
  });

  it('deve incluir elapsedTime quando for informado', () => {
    const result = createResponse(200, 'OK', undefined, '15ms');

    expect(result).toEqual({
      statusCode: 200,
      message: 'OK',
      elapsedTime: '15ms',
    });

    expect(result).not.toHaveProperty('data');
  });

  it('deve incluir data e elapsedTime quando ambos forem informados', () => {
    const data = [1, 2, 3];

    const result = createResponse(200, 'OK', data, '3ms');

    expect(result).toEqual({
      statusCode: 200,
      message: 'OK',
      data,
      elapsedTime: '3ms',
    });
  });

  it('deve incluir data mesmo quando for null (pois null é diferente de undefined)', () => {
    const result = createResponse(200, 'OK', null);

    expect(result).toEqual({
      statusCode: 200,
      message: 'OK',
      data: null,
    });
  });
});
