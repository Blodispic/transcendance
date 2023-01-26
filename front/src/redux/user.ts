import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { IUser, UserStatus } from '../interface/User';

interface StateTest {
    user: IUser | undefined,
    isLog: boolean,
}

const initialUser: StateTest = {
    user: undefined,
    isLog: false,
}

export const userSlice = createSlice({
    name: 'user',
    initialState: initialUser,
    reducers: {
        setUser: (state, { payload }: PayloadAction<IUser>) => {
            state.user = payload;
        },
        change_name: (state, { payload }: PayloadAction<string>) => {
            state.user!.username = payload;
        },
        change_status: (state, { payload }: PayloadAction<UserStatus>) => {
            state.user!.status = payload;
        },
        change_avatar(state, { payload }: PayloadAction<string>) {
            state.user!.avatar = payload;
        },
        log_unlog(state) {
            if (state.isLog == false)
                state.isLog = true;
            else
                state.isLog = false;
        }

    },
})

export const { setUser, change_status, change_name, change_avatar, log_unlog} = userSlice.actions
export default userSlice.reducer