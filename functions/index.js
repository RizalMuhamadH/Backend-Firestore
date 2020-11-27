const functions = require('firebase-functions');
const admin = require('firebase-admin');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
admin.initializeApp();

// exports.helloWorld = functions.https.onRequest((request, response) => {
//     functions.logger.info("Hello logs!", { structuredData: true });
//     response.send("Hello from Firebase!");
// });
exports.createNewRoom = functions.firestore
    .document('conversations/{roomId}')
    .onCreate((snapshot, context) => {
        const snap = snapshot.data();
        const roomId = context.params.roomId;
        var users = [];

        if (snap.type == "personal") {
            admin.firestore().collection('users').where("id", "in", snap.members)
                .get()
                .then((query) => {

                    query.docs.forEach((doc) => {
                        const val = doc.data();
                        // admin.firestore().collection('conversations').doc(roomId).collection('members').add({
                        //     id: val.id,
                        //     name: val.name,
                        //     email: val.email,
                        //     avatar: val.avatar,
                        //     is_online: val.is_online,
                        //     last_active: val.last_active
                        // }).then((value) => null).catch(() => null);
                        users.push({
                            id: val.id,
                            name: val.name,
                            email: val.email,
                            avatar: val.avatar,
                            is_online: val.is_online,
                            last_active: val.last_active
                        });

                        console.log(users);

                    });

                    snapshot.ref.update({ users: users }).then((value) => null).catch(() => null);
                    return null;
                });
        }

        snapshot.ref.update({ id: roomId }).then((value) => null).catch(() => null);


        return null
    });

exports.setLastMessageRoom = functions.firestore
    .document('conversations/{roomId}/messages/{messageId}')
    .onCreate((snapshot, context) => {
        const messageId = context.params.messageId;
        const roomId = context.params.roomId;
        const snap = snapshot.data();

        admin.firestore().collection('conversations')
            .doc(roomId)
            .get()
            .then((doc) => {
                doc.ref.update({
                    last_message: {
                        id: messageId,
                        body: snap.body,
                        type: snap.type,
                        path: snap.path,
                        sender: snap.sender,
                        created_at: snap.created_at,
                        deleted_at: snap.deleted_at,
                        is_read: snap.is_read
                    }
                });
                if (doc.data().type != "personal") {
                    admin.firestore().collection('users').where("id", "==", snap.sender)
                        .get()
                        .then((value) => {
                            const val = value.data();
                            doc.ref.update({
                                users: [{
                                    id: val.id,
                                    name: val.name,
                                    email: val.email,
                                    avatar: val.avatar,
                                    is_online: val.is_online,
                                    last_active: val.last_active
                                }]
                            });
                        }).catch(() => null);
                }
                return null
            }).catch(() => null);



        snapshot.ref.update({ id: messageId }).catch(() => null);

        return null;

    });

function sanitizedForProtection(inputText) {
    const re = /test/gi;
    const cleanedText = inputText.replace(re, "****");
    return cleanedText;
}

exports.updateLastMessageRoom = functions.firestore
    .document('conversations/{roomId}/messages/{messageId}')
    .onUpdate((change, context) => {
        const messageId = context.params.messageId;
        const roomId = context.params.roomId;
        // const snap = snapshot.data();
        const after = change.after.data();
        const before = change.before.data();

        admin.firestore().collection('conversations')
            .doc(roomId)
            .get()
            .then((doc) => {
                const val = doc.data();
                if (val.last_message.id === after.id) {
                    doc.ref.update({
                        last_message: {
                            id: messageId,
                            body: after.body,
                            type: after.type,
                            path: after.path,
                            sender: after.sender,
                            created_at: after.created_at,
                            deleted_at: after.deleted_at,
                            is_read: after.is_read
                        }
                    });
                }
                return null;
            }).catch(() => null);

        return null;

    });

exports.universalUpdateDataUser = functions.firestore
    .document('users/{userId}')
    .onUpdate((change, context) => {
        const dataAfter = change.after.data();
        const dataBefore = change.before.data();

        if (dataAfter) {
            if (dataAfter.name === dataBefore.name &&
                dataAfter.email === dataBefore.email &&
                dataAfter.avatar === dataBefore.avatar && dataAfter.is_online === dataBefore.is_online) {
                console.log("it's same");
                return null;
            }
            admin.firestore().collection('conversations').where("users", "array-contains-any", [{
                    name: dataBefore.name,
                    email: dataBefore.email,
                    id: dataBefore.id,
                    avatar: dataBefore.avatar
                }])
                .get()
                .then((query) => {
                    query.forEach((value) => {

                        let arrremove = value.ref.update({
                            members: admin.firestore.FieldValue.arrayRemove({
                                name: dataBefore.name,
                                email: dataBefore.email,
                                id: dataBefore.id,
                                avatar: dataBefore.avatar,
                                is_online: dataBefore.is_online
                            })
                        });

                        let arrUnion = value.ref.update({
                            members: admin.firestore.FieldValue.arrayUnion({
                                name: dataAfter.name,
                                email: dataAfter.email,
                                id: dataAfter.id,
                                avatar: dataAfter.avatar,
                                is_online: dataBefore.is_online
                            })
                        })
                    });
                    return null;
                }).catch(() => null);
            admin.firestore().collection('locations').where('id', '==', dataAfter.id)
                .get()
                .then((query) => {
                    query.forEach((value) => {
                        value.ref.update({
                            name: dataAfter.name,
                            email: dataAfter.email,
                            id: dataAfter.id,
                            avatar: dataAfter.avatar,
                            is_online: dataBefore.is_online
                        });
                    });
                    return null;
                });
            // return change.after.ref.update({ email: "emu@gmail.com" });
            return null;
        } else {
            return null;
        }
    });