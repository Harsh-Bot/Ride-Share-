import {
  collection,
  doc,
  Firestore,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc
} from 'firebase/firestore';
import { getFirestoreDb } from '../../../services/firebase';
import { collection as col, query, where, getDocs } from 'firebase/firestore';

type Campus = 'Burnaby' | 'Surrey' | 'burnaby' | 'surrey';

export type PickupPoint = {
  lat: number;
  lng: number;
  label: string;
  isApprox: boolean;
};

export type RequestDoc = {
  postId: string;
  riderId: string;
  destinationCampus: Campus;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'canceled' | 'booked';
  pickup: PickupPoint;
  autoAccepted: boolean;
  bookingId: string | null;
  createdAt: Timestamp;
  expiresAt: Timestamp;
};

export type HoldDoc = {
  postId: string;
  requestId: string;
  riderId: string;
  seats: number;
  state: 'active' | 'released' | 'consumed';
  createdAt: Timestamp;
  expiresAt: Timestamp;
};

export type BookingDoc = {
  postId: string;
  riderId: string;
  driverId: string;
  seats: number;
  pickup: PickupPoint;
  status: 'confirmed' | 'canceled' | 'completed';
  createdAt: Timestamp;
  completedAt: Timestamp | null;
  requestId: string;
};

export const getRideRequestsCol = (db: Firestore) => collection(db, 'rideRequests');
export const getHoldsCol = (db: Firestore) => collection(db, 'holds');
export const getBookingsCol = (db: Firestore) => collection(db, 'bookings');

type RequestRideParams = {
  postId: string;
  riderId: string;
  destinationCampus: Campus;
  pickup: PickupPoint;
  seats?: number;
  now?: () => number;
  db?: Firestore;
};

export const requestRide = async ({
  postId,
  riderId,
  destinationCampus,
  pickup,
  seats = 1,
  now = Date.now,
  db = getFirestoreDb()
}: RequestRideParams) => {
  const rideRequests = getRideRequestsCol(db);
  const holds = getHoldsCol(db);
  const bookings = getBookingsCol(db);

  const requestRef = doc(rideRequests);
  const holdRef = doc(holds);
  const bookingRef = doc(bookings);
  const postRef = doc(db, 'ridePosts', postId);

  // one-active rule (MVP, outside tx): auto-cancel pending requests for same campus
  try {
    const pendingQ = query(
      getRideRequestsCol(db),
      where('riderId', '==', riderId),
      where('destinationCampus', '==', destinationCampus),
      where('status', '==', 'pending')
    );
    const pendingSnap = await getDocs(pendingQ);
    for (const docSnap of pendingSnap.docs) {
      await cancelRequest(docSnap.id, { db });
    }
  } catch {}

  await runTransaction(db, async (tx) => {
    const postSnap = await tx.get(postRef);
    if (!postSnap.exists()) throw new Error('POST_NOT_FOUND');
    const post = postSnap.data() as any;
    if (post.status !== 'open') throw new Error('POST_CLOSED');
    if (post.windowEnd?.toMillis && post.windowEnd.toMillis() < now()) throw new Error('TIME_WINDOW_PAST');

    // one-active rule: naive client-enforced in MVP (skip cross-queries in tx)

    if ((post.seatsAvailable ?? 0) < seats) throw new Error('NO_SEATS');

    const createdAt = Timestamp.fromMillis(now());
    const expiresAt = Timestamp.fromMillis(now() + 10 * 60_000);

    // read driver settings BEFORE any writes (transaction constraint)
    const userRef = doc(db, 'users', post.driverId ?? '');
    const driverSettingsSnap = post.driverId ? await tx.get(userRef) : null;
    const autoAccept = driverSettingsSnap?.exists() ? !!driverSettingsSnap.data()?.settings?.autoAccept : false;

    // decrement seats
    tx.update(postRef, { seatsAvailable: (post.seatsAvailable ?? 0) - seats, updatedAt: serverTimestamp() });

    // create request
    tx.set(requestRef, {
      postId,
      riderId,
      destinationCampus,
      status: 'pending',
      pickup,
      autoAccepted: false,
      bookingId: null,
      createdAt,
      expiresAt
    } as RequestDoc);

    // create hold
    tx.set(holdRef, {
      postId,
      requestId: requestRef.id,
      riderId,
      seats,
      state: 'active',
      createdAt,
      expiresAt
    } as HoldDoc);
    if (autoAccept) {
      tx.set(bookingRef, {
        postId,
        riderId,
        driverId: post.driverId,
        seats,
        pickup,
        status: 'confirmed',
        createdAt,
        completedAt: null,
        requestId: requestRef.id
      } as BookingDoc);
      tx.update(requestRef, { status: 'booked', autoAccepted: true, bookingId: bookingRef.id } as Partial<RequestDoc>);
      tx.update(holdRef, { state: 'consumed' } as Partial<HoldDoc>);
    }
  });

  return { requestId: requestRef.id, holdId: holdRef.id };
};

export const acceptRequest = async (
  requestId: string,
  { db = getFirestoreDb() }: { db?: Firestore } = {}
) => {
  const requestRef = doc(db, 'rideRequests', requestId);
  await runTransaction(db, async (tx) => {
    const reqSnap = await tx.get(requestRef);
    if (!reqSnap.exists()) throw new Error('REQUEST_NOT_FOUND');
    const req = reqSnap.data() as RequestDoc;
    if (req.status !== 'pending' && req.status !== 'accepted') return; // idempotent

    const postRef = doc(db, 'ridePosts', req.postId);
    const postSnap = await tx.get(postRef);
    if (!postSnap.exists()) throw new Error('POST_NOT_FOUND');
    const post = postSnap.data() as any;

    // find hold by requestId (MVP: derive ref name)
    const holdRef = doc(db, 'holds', requestId); // Optimization: use same id == requestId in future
    // For MVP, we set holdRef by querying is not allowed in tx; fallback to expected created id pattern not guaranteed
    // So we will update request/booking and not rely on hold in tx; release path will handle missing

    const bookingRef = doc(collection(db, 'bookings'));
    tx.set(bookingRef, {
      postId: req.postId,
      riderId: req.riderId,
      driverId: post.driverId,
      seats: 1,
      pickup: req.pickup,
      status: 'confirmed',
      createdAt: serverTimestamp(),
      completedAt: null,
      requestId
    } as BookingDoc);
    tx.update(requestRef, { status: 'booked', bookingId: bookingRef.id } as Partial<RequestDoc>);
    // mark hold consumed best-effort outside tx
  });
};

export const declineRequest = async (
  requestId: string,
  { db = getFirestoreDb() }: { db?: Firestore } = {}
) => {
  const requestRef = doc(db, 'rideRequests', requestId);
  await runTransaction(db, async (tx) => {
    const reqSnap = await tx.get(requestRef);
    if (!reqSnap.exists()) return;
    const req = reqSnap.data() as RequestDoc;
    if (req.status !== 'pending' && req.status !== 'accepted') return;

    const postRef = doc(db, 'ridePosts', req.postId);
    const postSnap = await tx.get(postRef);
    if (postSnap.exists()) {
      const post = postSnap.data() as any;
      tx.update(postRef, { seatsAvailable: (post.seatsAvailable ?? 0) + 1, updatedAt: serverTimestamp() });
    }

    tx.update(requestRef, { status: 'declined' } as Partial<RequestDoc>);
  });
};

export const cancelRequest = async (
  requestId: string,
  { db = getFirestoreDb() }: { db?: Firestore } = {}
) => {
  const requestRef = doc(db, 'rideRequests', requestId);
  await runTransaction(db, async (tx) => {
    const reqSnap = await tx.get(requestRef);
    if (!reqSnap.exists()) return;
    const req = reqSnap.data() as RequestDoc;
    if (req.status !== 'pending') return;
    const postRef = doc(db, 'ridePosts', req.postId);
    const postSnap = await tx.get(postRef);
    if (postSnap.exists()) {
      const post = postSnap.data() as any;
      tx.update(postRef, { seatsAvailable: (post.seatsAvailable ?? 0) + 1, updatedAt: serverTimestamp() });
    }
    tx.update(requestRef, { status: 'canceled' } as Partial<RequestDoc>);
  });
};

export const cancelBooking = async (
  bookingId: string,
  { db = getFirestoreDb() }: { db?: Firestore } = {}
) => {
  const bookingRef = doc(db, 'bookings', bookingId);
  await runTransaction(db, async (tx) => {
    const bSnap = await tx.get(bookingRef);
    if (!bSnap.exists()) return;
    const booking = bSnap.data() as BookingDoc;
    if (booking.status !== 'confirmed') return;
    const postRef = doc(db, 'ridePosts', booking.postId);
    const postSnap = await tx.get(postRef);
    if (postSnap.exists()) {
      const post = postSnap.data() as any;
      tx.update(postRef, { seatsAvailable: (post.seatsAvailable ?? 0) + (booking.seats ?? 1), updatedAt: serverTimestamp() });
    }
    tx.update(bookingRef, { status: 'canceled' } as Partial<BookingDoc>);
  });
};

export const ttlSweepPendingRequests = async ({ db = getFirestoreDb(), now = Date.now }: { db?: Firestore; now?: () => number }) => {
  // MVP: no query in SDK without building filters here; for hackathon, take a list of candidate IDs from UI
  // This function is a placeholder to be called with known request IDs and will expire if needed.
  return;
};

export const expireRequestIfNeeded = async (
  requestId: string,
  { db = getFirestoreDb(), now = Date.now }: { db?: Firestore; now?: () => number }
) => {
  const requestRef = doc(db, 'rideRequests', requestId);
  await runTransaction(db, async (tx) => {
    const reqSnap = await tx.get(requestRef);
    if (!reqSnap.exists()) return;
    const req = reqSnap.data() as RequestDoc;
    if (req.status !== 'pending') return;
    if (req.expiresAt?.toMillis && req.expiresAt.toMillis() > now()) return;

    const postRef = doc(db, 'ridePosts', req.postId);
    const postSnap = await tx.get(postRef);
    if (postSnap.exists()) {
      const post = postSnap.data() as any;
      tx.update(postRef, { seatsAvailable: (post.seatsAvailable ?? 0) + 1, updatedAt: serverTimestamp() });
    }
    tx.update(requestRef, { status: 'expired' } as Partial<RequestDoc>);
  });
};
