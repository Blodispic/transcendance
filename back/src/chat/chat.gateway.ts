import { BadRequestException } from "@nestjs/common";
import { WebSocketGateway, OnGatewayInit, OnGatewayDisconnect, WebSocketServer, SubscribeMessage, ConnectedSocket, MessageBody } from "@nestjs/websockets";
import { userInfo } from "os";
import { Server, Socket } from "socket.io";
import { AppService } from "src/app.service";
import { ChannelService } from "src/chat/channel/channel.service";
import { user } from "src/game/game.controller";
import { User } from "src/user/entities/user.entity";
import { UserService } from "src/user/user.service";
import { CreateChannelDto } from "./channel/dto/create-channel.dto";
import { Chat } from "./chat.entity";
import { JoinChannelDto } from "./dto/join-channel.dto";
import { LeaveChannelDto } from "./dto/leave-channel.dto";
import { MessageChannelDto } from "./dto/message-channel.dto";
import { MessageUserDto } from "./dto/message-user.dto";
import { userList } from "src/app.gateway";
import { AppGateway } from "src/app.gateway";
import { CreatePublicChannelDto } from "./dto/create-channel.dto";

/*ToDo
  - check if password et password ok pour join chan
    + password has to be chiffré

  - check if blocked user in case of messageSend

  - owner can add, modify, delete password ( =? change channel's status ?)

  - owner can give owner role to others users

  - owner can mute and ban for a fixed term

*/

@WebSocketGateway({
	cors: {
	  origin: '*',
	},
   })
export class ChatGateway
{
 constructor(
  private channelService: ChannelService,
  private userService: UserService,
 ) {}
 
 
  @WebSocketServer() server: Server;
 
//  @SubscribeMessage('sendMessage')
//  async handleSendMessage(@ConnectedSocket() client: Socket, @MessageBody() data: any): Promise<void> {
// 	console.log(data)
//   // this.server.to(client.id).emit("cc", "bjr")
//    this.server.emit('recMessage', data);
//  }
 
 @SubscribeMessage('sendMessageUser')
 async handleSendMessageUser(@ConnectedSocket() client: Socket, @MessageBody() messageUserDto: MessageUserDto)/* : Promise<any> */ {
  //  const user = await this.userService.getById(messageUserDto.useridtowho);
  const socketIdToWho = this.findSocketFromUser(messageUserDto.usertowho);
  if (socketIdToWho === null)
    throw new BadRequestException();
  this.server.to(socketIdToWho).emit("sendMessageUserOk", messageUserDto.message);
 

 }

findSocketFromUser(user: User)
 {
   userList.forEach(client => {
     if (client.handshake.auth.user === user)
      return client;
   });
   return null;
 }


@SubscribeMessage('sendMessageChannel')
async handleSendMessageChannel(@ConnectedSocket() client: Socket, @MessageBody() messageChannelDto: MessageChannelDto)/* : Promise<any> */ {
  const channel = await this.channelService.getById(messageChannelDto.chanid);
  if (channel == null)
    throw new BadRequestException();
  // channel.users.forEach(user => {
  //     this.server.to("user-" + user.id).emit("sendMessageChannel", messageChannelDto);
  // });
  this.server.to("chan" + messageChannelDto.chanid).emit("sendMessageChannelOK", messageChannelDto.message);

}

@SubscribeMessage('joinChannel')
async handleJoinChannel(@ConnectedSocket() client: Socket, @MessageBody() joinChannelDto: JoinChannelDto) {    
  const channel = await this.channelService.getById(joinChannelDto.chanid);
  if (channel === null)
    throw new BadRequestException();
  this.channelService.add({
    user: client.handshake.auth.user,
    chanId: channel.id,
  });
  client.join("chan" + joinChannelDto.chanid);
  client.emit("joinChannelOK", channel.id);
}

@SubscribeMessage('createPublicChannel')
async handleCreatePublicChannel(@ConnectedSocket() client: Socket, @MessageBody() createPublicChannelDto: CreatePublicChannelDto) {    
  const channel = await this.channelService.getByName(createPublicChannelDto.channame);
  if (channel != null)
    throw new BadRequestException();
    console.log(client.handshake.auth.user.username);
    console.log(createPublicChannelDto.channame);
    
  let user: User = client.handshake.auth.user;
  const new_channel = await this.channelService.create({
      name: createPublicChannelDto.channame,
      owner: user,
      users:[ user ],
     });
  this.channelService.add({
    user: user,
    chanId: new_channel.id,
  });
  client.join("chan" + new_channel.id);
  client.emit("createPublicChannelOk", new_channel.id);
}

@SubscribeMessage('leaveChannel')
async handleLeaveChannel(@ConnectedSocket() client: Socket, @MessageBody() leaveChannelDto: LeaveChannelDto) {
  const channel = await this.channelService.getById(leaveChannelDto.chanid);
  const user = client.handshake.auth.user;
  if (channel === null || user === null)
    throw new BadRequestException();
  this.channelService.rm( { user, chanid: leaveChannelDto.chanid});
  client.leave("chan" + leaveChannelDto.chanid);
}

 afterInit(server: Server) {
//    console.log(server);
   //Do stuffs
 }
 
//  handleDisconnect(client: Socket) {
//    console.log(`Disconnected: ${client.id}`);


//    //Do stuffs
//  }
 
//  handleConnection(client: Socket, ...args: any[]) {
//   // console.log("client id ", client.handshake.headers.authorization)
//    console.log(`Connected ${client.id}`);
//    console.log(client.handshake);
//    console.log(`Connecteddd ${client.id}`);
//   //  const token = {
//   //    id: client.
//   //  }
//   //  console.log("token.id :", token.id);
   
//   //  client.join("user-" + token.id);
//    //Do stuffs
//  }
}