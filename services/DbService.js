import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase.js";

/**
 * Get species list from Firestore.
 * param {"all"|"fish"|"plant"} kind - optional filter for the 'kind' field. Defaults to "all".
 * returns {Promise<Array<Object>>}
 */
export const getSpecies = async (kind = "all") => {
  const results = [];
  const colRef = collection(db, "species");
  const constraints = [];

  if (kind && kind !== "all") {
    constraints.push(where("kind", "==", kind));
  }

  const q = constraints.length ? query(colRef, ...constraints) : query(colRef);
  const snapshot = await getDocs(q);

  snapshot.forEach((doc) => {
    results.push({ id: doc.id, ...doc.data() });
  });

  return results;
};

// Backwards-compat (used by older screens)
export const getAllSpecies = async () => getSpecies("all");