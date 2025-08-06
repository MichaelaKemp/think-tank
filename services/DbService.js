import { collection, getDocs, query } from "firebase/firestore";
import { db } from "../firebase.js";

// Get all species 
export const getAllSpecies = async () => {
  const allSpecies = []; // array to return

  const q = query(collection(db, "species"));

  const snapshot = await getDocs(q);
  snapshot.forEach((doc) => {
    allSpecies.push({ id: doc.id, ...doc.data() }); // push each doc's data
  });

  return allSpecies;
};