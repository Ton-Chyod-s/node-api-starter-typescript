import * as jwt from 'jsonwebtoken';
import { JwtTokenService } from '@infrastructure/jwt/jwt-token-service';
import { TokenPayload } from '@domain/services/token-service';

describe('JwtTokenService', () => {
  const secret = 'test-secret';
  const issuer = 'test-issuer';
  const audience = 'test-audience';
  const algorithm: jwt.Algorithm = 'HS256';

  it('deve assinar e verificar o token corretamente (round-trip)', () => {
    const service = new JwtTokenService({
      secret,
      expiresIn: '1h',
      issuer,
      audience,
      algorithm,
    });

    const payload: TokenPayload = {
      sub: '123',
      role: 'USER',
    };

    const token = service.sign(payload);

    expect(typeof token).toBe('string');

    const decoded = service.verify(token);

    expect(decoded).toEqual(payload);
  });

  it('deve lançar erro ao verificar token com assinatura inválida', () => {
    const service = new JwtTokenService({
      secret,
      expiresIn: '1h',
      issuer,
      audience,
      algorithm,
    });

    const tokenAssinadoComOutroSegredo = jwt.sign({}, 'other-secret', {
      subject: '123',
      expiresIn: '1h',
      algorithm,
      issuer,
      audience,
    });

    expect(() => service.verify(tokenAssinadoComOutroSegredo)).toThrow(jwt.JsonWebTokenError);
  });

  it('deve lançar erro ao verificar token malformado', () => {
    const service = new JwtTokenService({
      secret,
      expiresIn: '1h',
      issuer,
      audience,
      algorithm,
    });

    expect(() => service.verify('token.mal.formado')).toThrow();
  });

  it('deve respeitar o expiresIn e lançar erro quando o token estiver expirado', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));

    const service = new JwtTokenService({
      secret,
      expiresIn: '1s',
      issuer,
      audience,
      algorithm,
    });

    const payload: TokenPayload = {
      sub: '123',
      role: 'USER',
    };

    const token = service.sign(payload);

    jest.advanceTimersByTime(1500);

    expect(() => service.verify(token)).toThrow(jwt.TokenExpiredError);

    jest.useRealTimers();
  });
});
