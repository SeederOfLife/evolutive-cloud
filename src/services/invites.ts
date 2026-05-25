import {
  collection, addDoc, getDocs, query, where, updateDoc, doc, deleteDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Invite {
  id: string;
  ownerId: string;
  ownerEmail: string;
  ownerDisplayName: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  revoked: boolean;
  usedBy?: string;
  usedAt?: string;
}

export interface LinkedAccount {
  id: string;
  ownerId: string;
  linkedUserId: string;
  linkedEmail: string;
  linkedDisplayName: string;
  role: 'collaborator' | 'viewer';
  linkedAt: string;
}

function generateToken(): string {
  const arr = new Uint8Array(20);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

export function getInviteUrl(token: string): string {
  return `${window.location.origin}/join/${token}`;
}

export async function createInvite(
  ownerId: string,
  ownerEmail: string,
  ownerDisplayName: string,
): Promise<Invite> {
  const token = generateToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const data = {
    ownerId,
    ownerEmail,
    ownerDisplayName,
    token,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    revoked: false,
  };
  const ref = await addDoc(collection(db, 'invites'), data);
  return { id: ref.id, ...data };
}

export async function getInviteByToken(token: string): Promise<Invite | null> {
  const q = query(collection(db, 'invites'), where('token', '==', token));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Invite;
}

export async function revokeInvite(inviteId: string): Promise<void> {
  await updateDoc(doc(db, 'invites', inviteId), { revoked: true });
}

export async function acceptInvite(
  invite: Invite,
  acceptorId: string,
  acceptorEmail: string,
  acceptorDisplayName: string,
): Promise<void> {
  if (invite.usedBy || invite.revoked) throw new Error('Invite already used or revoked.');
  if (invite.ownerId === acceptorId) throw new Error("You can't accept your own invite.");
  if (new Date(invite.expiresAt) < new Date()) throw new Error('This invite has expired.');

  await updateDoc(doc(db, 'invites', invite.id), {
    usedBy: acceptorId,
    usedAt: new Date().toISOString(),
  });

  const now = new Date().toISOString();
  await addDoc(collection(db, 'linked_accounts'), {
    ownerId: invite.ownerId,
    linkedUserId: acceptorId,
    linkedEmail: acceptorEmail,
    linkedDisplayName: acceptorDisplayName,
    role: 'collaborator',
    linkedAt: now,
  });
  await addDoc(collection(db, 'linked_accounts'), {
    ownerId: acceptorId,
    linkedUserId: invite.ownerId,
    linkedEmail: invite.ownerEmail,
    linkedDisplayName: invite.ownerDisplayName,
    role: 'collaborator',
    linkedAt: now,
  });
}

export async function getMyInvites(ownerId: string): Promise<Invite[]> {
  const q = query(collection(db, 'invites'), where('ownerId', '==', ownerId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Invite));
}

export async function getLinkedAccounts(userId: string): Promise<LinkedAccount[]> {
  const q = query(collection(db, 'linked_accounts'), where('ownerId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as LinkedAccount));
}

export async function unlinkAccount(
  linkedAccountId: string,
  myUserId: string,
  theirUserId: string,
): Promise<void> {
  await deleteDoc(doc(db, 'linked_accounts', linkedAccountId));
  // Remove reciprocal link: their record pointing back at me
  const q = query(
    collection(db, 'linked_accounts'),
    where('ownerId', '==', theirUserId),
    where('linkedUserId', '==', myUserId),
  );
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map(d => deleteDoc(doc(db, 'linked_accounts', d.id))));
}
