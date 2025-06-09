
export class BlockingQueue {
  constructor() {
    this.queue = [];
    this.resolvers = [];
  }

  take() {
    if (this.queue.length > 0) {
      return Promise.resolve(this.queue.shift());
    } else {
      //Save resolve and wait for message
      return new Promise((resolve) => {
        this.resolvers.push(resolve);
      });
    }
  }

  add(msg) {
    console.log("Adding msg to queue...", msg);

    if (this.resolvers.length > 0) {
      //Get resolve and send message
      const resolve = this.resolvers.shift();
      resolve(msg);
    } else {
      this.queue.push(msg);
    }
  }
}

export class TabAction {
  constructor(windowId, groupId) {
    this.windowId = windowId;
    this.groupId = groupId;
  }
}

export class CreateTabAction extends TabAction{
  constructor(windowId, groupId, index, id, url) {
    super(windowId, groupId);
    this.index = index;
    this.id = id;
    this.url = url;
  }
}

export class UpdateTabAction extends TabAction{
  constructor(windowId, groupId, id, url) {
    super(windowId, groupId);
    this.id = id;
    this.url = url;
  }
}

export class MoveTabAction extends TabAction{
  constructor(windowId, groupId, id, toIndex) {
    super(windowId, groupId);
    this.id = id;
    this.toIndex = toIndex;
  }
}

export class RemoveTabAction extends TabAction{
  constructor(windowId, groupId, id) {
    super(windowId, groupId);
    this.id = id;
  }
}
