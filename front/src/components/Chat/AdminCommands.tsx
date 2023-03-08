import { useEffect, useState } from "react";
import { HiOutlineXMark } from "react-icons/hi2";
import { socket } from "../../App";
import { IChannel } from "../../interface/Channel";

export function BanUser(props: { chanid: any, userid: any, trigger: boolean, setTrigger: Function }) {
	const [timeout, setTimeout] = useState<string>("");

	const handleBan = () => {
		if (timeout === "")
			socket.emit('BanUser', { chanid: props.chanid, userid: props.userid });
		else
			socket.emit('BanUser', { chanid: props.chanid, userid: props.userid, timeout: parseInt(timeout) * 1000 });
	}

	useEffect(() => {
		socket.on("banUserOK", (data) => {
			props.setTrigger(false);
			console.log("banuserOK");
		});
		return () => {
			socket.off("banUserOK");
		}
	})

	return (props.trigger) ? (
		<div className="chat-form-popup" onClick={_ => (props.setTrigger(false))}>
			<div className="chat-form-inner" onClick={e => e.stopPropagation()}>
				<HiOutlineXMark className="close-icon" onClick={_ => (props.setTrigger(false))} /> <br />
				<h2>Ban User</h2>
				<h4>Set time(optional)</h4>
				<input placeholder="Timeout in seconds" onChange={e => { setTimeout(e.target.value) }}></input>
				<br />
				<button onClick={_ => handleBan()}>Ban User</button>
			</div>
		</div>
	) : <></>;
}

export function MuteUser(props: { chanid: any, userid: any, trigger: boolean, setTrigger: Function }) {
	const [timeout, setTimeout] = useState<string>("");

	const handleBan = () => {
		if (timeout === "")
			socket.emit('MuteUser', { chanid: props.chanid, userid: props.userid });
		else
			socket.emit('MuteUser', { chanid: props.chanid, userid: props.userid, timeout: parseInt(timeout) * 1000 });
	}

	useEffect(() => {
		socket.on("muteUserOK", (data) => {
			props.setTrigger(false);
			console.log("muteUserOK");
		});
		return () => {
			socket.off("muteUserOK");
		}
	})

	return (props.trigger) ? (
		<div className="chat-form-popup" onClick={_ => (props.setTrigger(false))}>
			<div className="chat-form-inner" onClick={e => e.stopPropagation()}>
				<HiOutlineXMark className="close-icon" onClick={_ => (props.setTrigger(false))} /> <br />
				<h2>Mute User</h2>
				<h4>Set time(optional)</h4>
				<input placeholder="Timeout in seconds" onChange={e => { setTimeout(e.target.value) }}></input>
				<br />
				<button onClick={_ => handleBan()}>Ban User</button>
			</div>
		</div>
	) : <></>;
}

// export function MuteUser(chanid: any, userid: any) {
// 	socket.emit('MuteUser', {chanid: chanid, userid: userid});
// 	// socket.on('muteUserOK', (userId, chanId) => {});
// }

export function AddAdmin(chanid: any, userid: any) {
	socket.emit('GiveAdmin', {chanid: chanid, userid: userid});
}

export function KickUser(chanid: any, userid: any) {
	//socket.emit('KickUser')
}

function RemoveChannel() {
	// remove channel method on the back;
}

export function ConfigureChannel(props: {trigger: boolean, setTrigger: Function, channel: IChannel}) {
	const [newPassword, setNewPassword] = useState("");
	
	const setPassword = () => {
		if (props.channel.chanType === 0 && newPassword !== undefined) {
			console.log('add password: ', newPassword);
			socket.emit('addPassword', { chanid: props.channel.id, password: newPassword });
		}
		else if (props.channel.chanType === 2) {
			console.log('change password: ', newPassword);
			socket.emit('changePassword', { chanid: props.channel.id, password: newPassword });
		}
		props.setTrigger(false);
	}

	const removePassword = () => {
		console.log('remove password');
		socket.emit('rmPassword', { chanid: props.channel.id, pass: "" });
		props.setTrigger(false);
	}

	return (props.trigger) ? (
		<div className="chat-form-popup" onClick={_ => props.setTrigger(false)}>
			<div className="chat-form-inner" onClick={e => e.stopPropagation()}>
				<HiOutlineXMark className="close-icon" onClick={_ => props.setTrigger(false)} /> <br />
				{
					props.channel.chanType === 0 &&
					<>
					<h3>Set Password</h3>
					<input type="password" id="channel-input" placeholder="Insert password" onChange={e => { setNewPassword(e.target.value); }} /><br />
					</>
				}
				{/* {
					props.channel.chanType === 1 &&
					<>
					<h3>Set New Password</h3>
					<input type="password" id="channel-input" placeholder="Insert password" onChange={e => { setNewPassword(e.target.value); }} /><br />
					</>
				} */}
				{
					props.channel.chanType === 2 &&
					<>
					<h3> Remove Password </h3>
					<button style={{background:'#B33A3A'}} onClick={removePassword}> Remove Password </button> 
					<h3>Change Password</h3>
					<input type="password" id="channel-input" placeholder="Insert new password" onChange={e => { setNewPassword(e.target.value); }} /><br />
					</>
				}
				<button onClick={setPassword}> Save Setting </button>
				{/* <h3> Remove Channel </h3> */}
				{/* <button style={{background:'#B33A3A'}} onClick={RemoveChannel}> Remove Channel </button> */}
			</div>
		</div>
	) : <></>;
}
