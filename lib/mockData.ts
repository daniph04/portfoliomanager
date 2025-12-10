// Initial empty state for Portfolio League
// The app starts with NO demo data - users create their own members and holdings

import { GroupState } from "./types";

export const initialGroupState: GroupState = {
    id: "default-group",
    name: "Default",
    members: [],
    holdings: [],
    activity: [],
    portfolioHistory: [],
};
