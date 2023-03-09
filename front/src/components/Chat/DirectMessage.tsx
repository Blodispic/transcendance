import { render } from "@testing-library/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useParams } from "react-router-dom";
import { socket } from "../../App";
import { IMessage } from "../../interface/Message";
import { IUser } from "../../interface/User";
import { useAppSelector } from "../../redux/Hook";
import CustomGamePopup from "../Game/CustomGamePopup";

// make a list of friends that had conversation with
function DMList(props: {currentdm: IUser | undefined; setCurrentDm: Function}) {
	const [alluser, setAlluser] = useState<IUser[] | undefined>(undefined);
	const myUser = useAppSelector(state => state.user);

	useEffect(() => {
		const get_all = async () => {
			const response = await fetch(`${process.env.REACT_APP_BACK}user`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
			})
			const data = await response.json();
			setAlluser(data.filter((User: { status: string; }) => User.status === "Online"));
			setAlluser(data.filter((User: { username: string; }) => User.username !== myUser.user?.username));
		}
		get_all();
	}, [])

	return (
		<div className="title"> Direct Messages <hr />
			{alluser != undefined &&
				<>
					{alluser && alluser.map(user => (
						<ul key={user.username} onClick={_ => props.setCurrentDm(user)} >
							<li >
								{user.username}
							</li>
						</ul>
					))}
				</>
			}
		</div>
	);
}

function BlockUser(userid: number) {

	useEffect(() => {

		const blockUser = async () => {
            const response = await fetch(`${process.env.REACT_APP_BACK}user/block/`, {
				method: 'POST',
				body: JSON.stringify({ id: userid}),

			// 	method: 'POST',
			// 	body: JSON.stringify({ userId: user.id }),
			// 	headers: { 'Content-Type': 'application/json' },
			// 	credentials: 'include',
		});
			const data = await response.json();
		}
		blockUser();
		
	}, []);

}


function UnblockUser(userid: number) {
		
	useEffect(() => {

		const unblockUser = async() => {
            const response = await fetch(`${process.env.REACT_APP_BACK}user/unblock/`, {
				method: 'DELETE',
				body: JSON.stringify({ id: userid}),

			});
			const data = await response.json();
		}
		unblockUser();
	})
}

function InfoFriend(props: {user: IUser}) {

	const user: IUser = props.user;
	const [myVar, setMyvar] = useState<boolean>(false);

	return (
		<div className="title"> menu <hr />
		<div className="menu hover-style">

		 <ul >
                    <li >
                        <Link to={`/Profile/${user.id}`}>
                            Profile
                        </Link>
                    </li>
                    
                        <>
                            <li>
                                <a>
                                   Add friend
                                </a>
                            </li>
                           
                            <li onClick={_ => setMyvar(true)}>
                                Invite Game
                            </li>
							<li onClick={_ => BlockUser(user.id)}>
								Block
							</li>
                        </>
                </ul>
		</div>
		{
                <CustomGamePopup trigger={myVar} setTrigger={setMyvar} friend={user} />
        }
		</div>
	);
}

export function DmMessages(props: { id: any; currentdm: IUser | undefined; setCurrentDm: Function}) {

	const [newInput, setNewInput] = useState("");
	const [messageList, setMessageList] = useState<IMessage[]>([]);
	const [blockedId, setBlockedId] = useState(0);
	const myUser = useAppSelector(state => state.user);

	const handleSubmitNewMessage = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (newInput != "") {
	
			const sendtime = new Date().toLocaleString();
			socket.emit('sendMessageUser', { usertowho: props.currentdm, sender: myUser.user, message: newInput, sendtime: sendtime });
			const newMessage: IMessage = {sender: myUser!.user, message: newInput, usertowho: props.currentdm, sendtime: sendtime};

			setMessageList([...messageList, newMessage]);
		}
		setNewInput("");
	}

	useEffect(() => {
		socket.on('sendMessageUserOK', (messageUserDto) => {
			setMessageList([...messageList, messageUserDto]);
		})
		return () => {
			socket.off('sendMessageUserOK');
		};
	});

	useEffect(() => {
		setMessageList([]);
	}, [props.currentdm]);

	const handleBlock = () => { // to be improved
		// if (blockedId == 0 && props.currentdm !== undefined)
		// {
		// 	setBlockedId(props.currentdm?.id);
		// 	// emit block to the back
		// }
		// else
		// {
		// 	setBlockedId(0);
		// 	// emit unblock to the back
		// }
	}
	return (
		<div className="chat-body">
			<div className="body-header">
				<img className="user-avatar" src={props.currentdm?.avatar} onClick={_ => handleBlock()} />
				{props.currentdm?.username}
			</div>
			<div className="chat-messages">
				<div className="reverse">

				{messageList && messageList.map(message => (
					<div key={message.sendtime + message.message} className="__wrap">
						<div className="message-info">
							<img className="user-avatar" src={message.sender?.avatar} />
							{message.sender?.username}
							<span className="timestamp">{message.sendtime}</span>
						</div>
						{message.message}
					</div>
				))}
				</div>
			</div>
			{
				props.id !== undefined &&
				<form id="input_form" onSubmit={(e) => { handleSubmitNewMessage(e); }}>
					<input type="text" onChange={(e) => { setNewInput(e.target.value) }}
						placeholder="type message here" value={newInput} />
				</form>
			}
		</div>
	);
}


export function DirectMessage(props: any) {
	const [currentDm, setCurrentDm] = useState<IUser | undefined>(undefined);
	// useEffect(() => {
	// 	setCurrentDm(undefined);
	// }, [])
	return (
		<div id="chat-container">
			<div className="sidebar left-sidebar">
				<DMList currentdm={currentDm} setCurrentDm={setCurrentDm} />
			</div>
			{currentDm !== undefined &&
				<>
					<DmMessages id={props} currentdm={currentDm} setCurrentDm={setCurrentDm} />
					<div className="sidebar left-sidebar">
						<InfoFriend user={currentDm} />
					</div>
				</>
			}

			{/* <div className="sidebar right-sidebar"> */}
			{/* <AllFriendList /> */}
			{/* </div> */}
		</div>
	);
}