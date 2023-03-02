import { useEffect, useState } from "react";
import { BsKeyFill } from "react-icons/bs";
import { HiLockClosed } from "react-icons/hi2";
import { ImCog } from "react-icons/im";
import { socket } from "../../App";
import { IChannel } from "../../interface/Channel";
import { IMessage } from "../../interface/Message";
import { useAppSelector } from "../../redux/Hook";
import { ConfigureChannel } from "./AdminCommands";
import { JoinChannel, JoinLeave, LeaveChannel } from "./JoinLeave";

export function ChannelMessages(props: { chanId: any }) {
	const [newInput, setNewInput] = useState("");
	const [messageList, setMessageList] = useState<IMessage[]>([]);
	const [currentChan, setCurrentChan] = useState<IChannel | undefined>(undefined);
	const currentUser = useAppSelector(state => state.user);
	const [popup, setPopup] = useState(false);

	useEffect(() => {
		const getChannel = async () => {
			const response = await fetch(`${process.env.REACT_APP_BACK}channel/${props.chanId}`, {
				method: 'GET',
			})
			const data = await response.json();
			if (currentChan?.id !== props.chanId) {
				setCurrentChan(data);
				setMessageList(messageList => []);
			}
		}
		getChannel();
	}, [props]);

	const handleSubmitNewMessage = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (newInput != "") {
			const sendTime = new Date().toLocaleString();
			socket.emit('sendMessageChannel', { chanid: currentChan?.id, sender: currentUser.user, message: newInput, sendtime: sendTime });
		}
		setNewInput("");
	}

	socket.on('sendMessageChannelOK', (messageDto) => {
		setMessageList([...messageList, messageDto]);
	})

	return (
		<div className="chat-body">
			<div className="body-header" >
				{currentChan?.name}
				{
					currentChan?.chanType == 1 &&
					<HiLockClosed />
				}
				{
					currentChan?.chanType == 2 &&
					<BsKeyFill />
				}
				{
					currentChan !== undefined &&
					<JoinLeave currentUser={currentUser.user} channel={currentChan} />
				}
				{
					currentChan?.id &&
					<>
						{
							currentChan.chanType !== 1 &&
							<>
								<ImCog className="config-icon" onClick={() => setPopup(true)} />
								<ConfigureChannel trigger={popup} setTrigger={setPopup} channel={currentChan} />
							</>
						}
					</>
				}
			</div>
			<div className="chat-messages">
				<div className="reverse">
					{messageList && messageList.map(message => (
						message.chanid == currentChan?.id &&
						<div key={message.message} className="__wrap">
							<div className="message-info">
								<img className="user-avatar" src={message.sender?.avatar} />
								<p>{message.sender?.username}</p>
								<p className="timestamp">{message.sendtime}</p>
							</div>
							{message.message}
						</div>
					))}
				</div>
			</div>
			{
				currentChan !== undefined &&
				<>
					{
						currentChan?.users.find(elem => elem.id == currentUser.user?.id) !== undefined &&
						<form id="input_form" onSubmit={(e) => { handleSubmitNewMessage(e); }}>
							<input type="text" onChange={(e) => { setNewInput(e.target.value) }}
								placeholder="type message here" value={newInput} />
						</form>
					}
				</>

			}
		</div>
	);
}
