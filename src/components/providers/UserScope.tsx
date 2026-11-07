"use client";
import {createContext,useContext} from "react";
export const UserScope = createContext("preview");
export function useUserScope() { return useContext(UserScope); }
