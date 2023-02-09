import react, { useEffect, useState } from "react";
import { ImCheckmark, ImCross } from "react-icons/im";
import { IUser } from "../../interface/User";

export function InviteButton(props: { user: any }) {
    const { user } = props;

    const pathname = window.location.pathname;
    const pathArray = pathname.split('/');
    const friendId = pathArray[pathArray.length - 1];
    const [status, setStatus] = useState<string>('+ Add Friend');

    const sendFriendRequest = async () => {
            await fetch(`${process.env.REACT_APP_BACK}user/friend-request/send/${friendId}`, {
                    method: 'POST',
                    body: JSON.stringify(user),
                    headers: { 'Content-Type': 'application/json' }
            });
            setStatus('Pending');
    }

    useEffect(() => {
            const checkFriendRequest = async () => {
                    const response = await fetch(`${process.env.REACT_APP_BACK}user/friend-request/status/${friendId}`, {
                            method: 'POST',
                            body: JSON.stringify(user),
                            headers: { 'Content-Type': 'application/json' }
                    });
                    const data = await response.json()
                    if (data.status)
                            setStatus(data.status);
                    else
                            setStatus("+ Add Friend");
            }
            checkFriendRequest();
    }, [friendId, user]);
    
    return (
            <button className="reqButton pointer white width_50" onClick={sendFriendRequest} >
                    {status}
            </button>
    )
}

export function Friends(props: { user: IUser }) {
    const { user } = props;
    const friendReq: any = [];

    useEffect(() => {
            const checkFriendRequest = async () => {
                    const response = await fetch(`${process.env.REACT_APP_BACK}user/friends`, {
                            method: 'POST',
                            body: JSON.stringify(user),
                            headers: { 'Content-Type': 'application/json' }
                    });
                    const data = await response.json()

                    console.log("checkdata", data);
            };
            checkFriendRequest();
    })

    interface FriendsListProps {
            friends: { name: string, avatar: string, status: string }[];
    }


    const FriendsList = (props: FriendsListProps) => {
            return (
                    <ul className="friends-list">
                            {props.friends.map(friend => (
                                    <li className="friend-block" key={friend.name}>
                                            <div className="friend-img">
                                                    <img src={friend.avatar} alt={friend.name} />
                                            </div>
                                            <div className="friend-info">
                                                    <div className="friend-name">{friend.name}</div>
                                                    <div className="friend-status">{friend.status}</div>
                                            </div>
                                            <div className="friend-actions">
                                                    <button className="accept-button"><ImCheckmark /></button>
                                                    <button className="refuse-button"><ImCross /></button>
                                            </div>

                                    </li>
                            ))}
                    </ul>
            )
    }



    const FriendsReq = () => {
            const friendReq = [
            { name: 'Ross', avatar: 'https://img.freepik.com/vecteurs-premium/panda-mignon-tenant-bambou-pouce-vers-haut-icone-vecteur-dessin-anime-illustration-nature-animale-isolee_138676-4817.jpg?w=360', status: 'Online' },
            { name: 'Rachel', avatar: 'http://10.1.8.1:4000/user/3/avatar', status: 'Online' },
            { name: 'Joey', avatar: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRpamtYxWbURGcTSVFTmsrY16rf3d_I39DhAQ&usqp=CAU', status: 'Online' },
            { name: 'Phoebe', avatar: 'https://i.pinimg.com/originals/d0/a2/e2/d0a2e243610bde1be54defdca162e47a.jpg', status: 'Online' },
            { name: 'Chandler', avatar: 'https://ih1.redbubble.net/image.1343394098.5639/flat,750x,075,f-pad,750x1000,f8f8f8.jpg', status: 'Online' },
            { name: 'Monica', avatar: 'https://www.gamosaurus.com/wp-content/uploads/Users/pikavatarsurf.png', status: 'Online' },
            ];
            return <FriendsList friends={friendReq} />;


    }

    return (
            <div className='FriendHeader'>

                    <FriendsReq />
                    <div className='FriendRequestBlock'>
                    </div>

                    <div className='FriendListBlock'>

                    </div>
            </div>
    )
}