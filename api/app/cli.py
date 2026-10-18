"""Manage API keys from the terminal.

    python -m app.cli create-key --name "laptop"
    python -m app.cli list-keys
    python -m app.cli revoke-key --id 2
    python -m app.cli revoke-key --prefix sk-spireflow-ab12cd
"""

from __future__ import annotations

import argparse

from .database import create_key, init_db, list_keys, revoke_key


def _cmd_create(args: argparse.Namespace) -> int:
    init_db()
    record = create_key(args.name)
    print(f"Created key '{record['name']}' (id {record['id']}, prefix {record['prefix']}).")
    print(f"  {record['key']}")
    print("Copy it now — it is not stored in plaintext and cannot be shown again.")
    return 0


def _cmd_list(_args: argparse.Namespace) -> int:
    init_db()
    keys = list_keys()
    if not keys:
        print("No API keys yet. Create one with: python -m app.cli create-key --name default")
        return 0
    width = max(len(k["name"]) for k in keys)
    print(f"{'ID':<4} {'NAME':<{width}}  {'PREFIX':<22} {'CREATED':<20} {'REVOKED':<7} LAST USED")
    for key in keys:
        print(
            f"{key['id']:<4} {key['name']:<{width}}  {key['prefix']:<22} "
            f"{key['created_at']:<20} {('yes' if key['revoked'] else 'no'):<7} "
            f"{key['last_used_at'] or '-'}"
        )
    return 0


def _cmd_revoke(args: argparse.Namespace) -> int:
    init_db()
    identifier: str | int = args.id if args.id is not None else args.prefix
    if identifier is None:
        print("Provide --id or --prefix.")
        return 2
    if revoke_key(identifier):
        print(f"Revoked key {identifier}.")
        return 0
    print(f"No key matched {identifier!r}.")
    return 1


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="app.cli", description="Spireflow API key management.")
    sub = parser.add_subparsers(dest="command", required=True)

    create = sub.add_parser("create-key", help="Mint a new API key.")
    create.add_argument("--name", default="default", help="A label for the key.")
    create.set_defaults(func=_cmd_create)

    listing = sub.add_parser("list-keys", help="List existing keys.")
    listing.set_defaults(func=_cmd_list)

    revoke = sub.add_parser("revoke-key", help="Revoke a key by id or prefix.")
    revoke.add_argument("--id", type=int, default=None)
    revoke.add_argument("--prefix", default=None)
    revoke.set_defaults(func=_cmd_revoke)

    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
