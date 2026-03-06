export type UserRole = 'USER' | 'ADMIN';

export interface UserProps {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  tokenVersion?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

type UserStoredProps = Readonly<Required<UserProps>>;

export class User {
  private readonly props: UserStoredProps;

  constructor(props: Readonly<UserProps>) {
    const now = new Date();

    const id = props.id?.trim();
    const name = props.name?.trim();
    const email = props.email?.trim().toLowerCase();

    if (!id) throw new Error('id is required');
    if (!name) throw new Error('name is required');
    if (!email) throw new Error('email is required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('email is invalid');
    if (!props.passwordHash) throw new Error('passwordHash is required');
    if (props.role !== 'USER' && props.role !== 'ADMIN') throw new Error('role is invalid');

    const normalized = {
      id,
      name,
      email,
      passwordHash: props.passwordHash,
      role: props.role,
      tokenVersion: props.tokenVersion ?? 0,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    } satisfies Required<UserProps>;

    this.props = Object.freeze(normalized);
  }

  get id() {
    return this.props.id;
  }

  get name() {
    return this.props.name;
  }

  get email() {
    return this.props.email;
  }

  get passwordHash() {
    return this.props.passwordHash;
  }

  get role() {
    return this.props.role;
  }

  get tokenVersion() {
    return this.props.tokenVersion;
  }

  get createdAt() {
    return this.props.createdAt;
  }

  get updatedAt() {
    return this.props.updatedAt;
  }

  changeName(name: string) {
    return new User({
      ...this.props,
      name,
      updatedAt: new Date(),
    });
  }

  promoteToAdmin() {
    if (this.role === 'ADMIN') return this;
    return new User({ ...this.props, role: 'ADMIN', updatedAt: new Date() });
  }
}
