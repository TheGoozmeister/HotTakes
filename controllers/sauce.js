const Sauce = require('../models/sauce');
const fs = require('fs');


const deleteUserIdFromArray = (array, userId) => {
    // Function that checks if a userId is the array and deletes it 
    // Returns the new array or the same if userId was not there
    
    for (let element of array) {
        if (element===userId) {
            array.splice(element,1);
        }
    }
    return array;
}

exports.getAllSauces = (req, res, next) => {
    Sauce.find().then(
        (sauces) => {
            res.status(200).json(sauces);
        }
    )
    .catch(
        (error) => {
            res.status(400).json({
                error: error
            });
        }
    );
}

exports.getOneSauce = (req, res, next) => {
    Sauce.findOne({
        _id: req.params.id
    }).then(
        (sauce) => {
            res.status(200).json(sauce);            
        }
    ).catch(
        (error) => {
            res.status(404).json({
                error: error
            });
        }
    );
}

exports.createSauce = (req, res, next) => {
    const sauceObject = JSON.parse(req.body.sauce);
    delete sauceObject._id;
    delete sauceObject.userId;
    const sauce = new Sauce ({
        ...sauceObject,
        userId: req.auth.userId,
        imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`,
        likes: 0,
        dislikes: 0,
        usersLiked: [],
        usersDisliked: [],
    });
    sauce.save().then(
        () => {
            res.status(201).json({
                message: "Success"
            });
        }
    ).catch(
        (error) => {
            res.status(400).json({
                error: error
            });
        }
    );
}

exports.deleteSauce = (req, res, next) => {
    Sauce.findOne({ _id: req.params.id })
        .then(sauce => {
            if (sauce.userId != req.auth.userId) {
                res.status(401).json({
                    message : 'Not authorized'
                });
            } else {
                const filename = sauce.imageUrl.split('/images/')[1];
                fs.unlink(('images/'+ filename), () => {
                    Sauce.deleteOne({_id : req.params.id})
                        .then(()=> {
                            res.status(200).json({message: 'Objet Supprimé'})
                        })
                        .catch((error)=>{
                            res.status(401).json({error})
                        });
                
                } )
            };
        }).catch(error => {
            res.status(500).json({ error });
        });
}

exports.modifySauce = (req, res, next) => {
    const sauceObject = req.file ? {  
      ...JSON.parse(req.body.sauce),
      imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
    } : { ...req.body };
    delete sauceObject._userId;
    Sauce.findOne({ _id: req.params.id})
        .then((sauce) => {
            if (sauce.userId != req.auth.userId) {
                res.status(401).json({message: 'Not authorized'});
            } else {
                const filename = sauce.imageUrl.split('/images/')[1];
                fs.unlink(('images/'+ filename), () => {
                    Sauce.updateOne({ _id: req.params.id}, {...sauceObject, _id: req.params.id})
                        .then(() => res.status(200).json({message: 'Sauce mise à jour'}))
                        .catch((error) => res.status(401).json({error}));
            })
        };
    })
        .catch((error) => res.status(401).json({ error }));
}

exports.likeStatus = (req,res,next) => {
    Sauce.findOne({ _id: req.params.id })
        .then((sauce) => {
            const like = req.body.like;
            const userId = req.auth.userId;
            let sauceLikes = sauce.likes; 
            let sauceDislikes = sauce.dislikes;
            let sauceUsersLiked = sauce.usersLiked;
            let sauceUsersDisliked = sauce.usersDisliked;

            if (like===1) {
                if (!sauceUsersLiked.includes(userId)) {
                    sauceUsersLiked.push(userId);
                    sauceLikes += 1;
                }
            }
            else if (like===0) {
                if (sauceUsersLiked.includes(userId)) {
                    deleteUserIdFromArray(sauceUsersLiked, userId);
                    sauceLikes -= 1;
                } else if (sauceUsersDisliked.includes(userId)) {
                    deleteUserIdFromArray(sauceUsersDisliked, userId);
                    sauceDislikes -= 1;
                }
            }
            else if (like===-1) {
                if (!sauceUsersDisliked.includes(userId)) {
                    sauceUsersDisliked.push(userId);
                    sauceDislikes += 1;
                } 
            }
            Sauce.updateOne({ _id: req.params.id}, {likes: sauceLikes, dislikes: sauceDislikes, usersLiked: sauceUsersLiked, usersDisliked: sauceUsersDisliked})
                .then(()=>{res.status(200).json({message: "Like mis à jour"})})
                .catch((error) => {res.status(400).json({error})});
            
        })
        .catch((error) => {
            console.log(error);
            res.status(500).json({ error })});
}

