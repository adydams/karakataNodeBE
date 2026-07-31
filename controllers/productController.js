const ProductService = require("../services/productServices");



exports.create = async(req,res)=>{

 try{

   const product =
     await ProductService.createProduct(
       req.body,
       req.files
     );


   return res.status(201).json({
     success:true,
     message:"Product created successfully",
     data:product

   });
 }catch(error){

   console.error(error);
   return res.status(400).json({
     success:false,
     message:error.message
   });
 }

};


exports.getAll = async(req,res)=>{

  try{


    const products =
      await ProductService.getAllProducts();
    const plainProducts = products.map(p => p.get({ plain: true }));
    console.log("Products fetched (plain):", JSON.stringify(plainProducts, null, 2));

    return res.status(200).json({

      success:true,

      data:plainProducts

    });


    }catch(error){


      return res.status(500).json({

        success:false,

        message:error.message

      });

    }

};





exports.getById = async(req,res)=>{

 try{


   const product =
     await ProductService.getProductById(
       req.params.id
     );



   if(!product){

     return res.status(404).json({

       success:false,

       message:"Product not found"

     });

   }



   return res.status(200).json({

     success:true,

     data:product

   });



 }catch(error){


   return res.status(500).json({

     success:false,

     message:error.message

   });


 }

};





  exports.update = async(req,res)=>{

  try{


    const product =
      await ProductService.updateProduct(

        req.params.id,

        req.body,

        req.files

      );



    if(!product){

      return res.status(404).json({

        success:false,

        message:"Product not found"

      });

    }



    return res.status(200).json({

      success:true,

      message:"Product updated successfully",

      data:product.get({ plain: true }).get({ plain: true })

    });



  }catch(error){


      return res.status(400).json({

        success:false,

        message:error.message

      });


  }

  };





exports.delete = async(req,res)=>{

    try{


      const product =
        await ProductService.deleteProduct(
          req.params.id
        );



      if(!product){

        return res.status(404).json({

          success:false,

          message:"Product not found"

        });

      }



      return res.status(200).json({

        success:true,

        message:"Product deleted successfully"

      });



    }catch(error){


      return res.status(500).json({

        success:false,

        message:error.message

      });


    }

};