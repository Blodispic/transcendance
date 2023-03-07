import { RouterProvider } from "react-router-dom";
import { useAppDispatch, useAppSelector } from './redux/Hook';
import { io, Socket } from 'socket.io-client';
import router from './router';
import { Cookies } from 'react-cookie';
import { setUser, set_status } from './redux/user';
import { useEffect, useState } from "react";
import { IUser, UserStatus } from "./interface/User";
import InviteGame from "./components/utils/InviteGame";

export let socket: Socket;

function App() {
  const myUser = useAppSelector(state => state.user);
  const myToken = useAppSelector(state => state.access_token);

  const dispatch = useAppDispatch();
  const cookies = new Cookies();
  const token = cookies.get('Token');
  const [trigger, setTrigger] = useState<boolean> (false);
  const [infoGame, setInfoGame] = useState<any | undefined> (undefined);


  useEffect(() => {
    if (myUser.isLog == true && token != undefined && myUser.user && myUser.user.username) {
      socket = io(`${process.env.REACT_APP_BACK}`, {
        auth: {
          token: token,
          user: myUser.user,
        }
      });
      socket.emit("UpdateSomeone", { idChange: myUser.user?.id, idChange2: 0 })
      socket.on("invitationInGame", (payload: any) => {
        setInfoGame(payload);
        setTrigger(true);
        setTimeout(() => {
					console.log("Retardée d'une seconde.");
					setTrigger(false)
				  }, 10000)
      })
    }
  }, [myUser.isLog])


  const get_user = async () => {
    const response = await fetch(`${process.env.REACT_APP_BACK}user/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${myToken.token}`,
      },
      body: JSON.stringify({ token: token }),
    })
    .then(async response => {
      const data = await response.json();
      // check for error response

      if (response.ok && data.username !== "") {
        dispatch(setUser(data))
        dispatch(set_status(UserStatus.ONLINE))
        // socket.emit("UpdateSomeone", { idChange: myUser.user?.id, idChange2: 0 })
      }
      else {
        cookies.remove('Token');
      }
    })
  }
  if (myUser.user === undefined) {
    if (token !== undefined)
      get_user();
  }

  return (

    <>
      <RouterProvider router={router} />
      {
        trigger === true && infoGame !== undefined &&
        <InviteGame infoGame={infoGame} setTrigger={setTrigger} />
      }
    </>
  );
}

export default App;
