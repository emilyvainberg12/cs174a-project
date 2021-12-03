import {defs, tiny} from './common.js';
import {Shape_From_File} from './load-obj.js';

import {Color_Phong_Shader, Shadow_Textured_Phong_Shader,
    Depth_Texture_Shader_2D, Buffered_Texture, LIGHT_DEPTH_TEX_SIZE} from './shadow-demo-shaders.js'
    
const {Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture, } = tiny;

const {Cube, Axis_Arrows, Textured_Phong} = defs


class Base_Scene extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();
        this.time = 0;

        this.isJumping = false;
        this.isCrouching = false;

        this.jumpStartTime = 0;

        this.game_time = 0; 

        this.dinoPosition = [0, 0];

        this.obstacles_model_transform_vector = [Mat4.identity()];
        this.obstacles_is_showing_vector = [false];

        this.rock_transform_vector = [Mat4.identity()];
        this.rock_is_showing_vector = [false];
        this.dino_transform = Mat4.identity();

        this.startScreen = true;
        this.gameOver = false;

        this.crouch_timer = 0; 
        this.level = 1;

        this.gameStartTime = 0;
        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            'cube': new Cube(),
            
            sphere: new defs.Subdivision_Sphere(6),

            'dino': new Shape_From_File("assets/dino.obj"),
        };

        // *** Materials
        this.materials = {
            plastic: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
            test: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
            dino: new Material(new Shadow_Textured_Phong_Shader(1),
                {ambient: 0.3, color: hex_color("#00FF00"),
                color_texture: null,
                light_depth_texture: null}),   //color is yellow
            
            start_texture: new Material(new Textured_Phong(),{
                color: hex_color("#000000"),
                ambient: 0.5,
                diffusivity: 0.1,
                specularity: 0.1,
                texture: new Texture("assets/start_screen.png")
            }),

            grass_texture: new Material(new Shadow_Textured_Phong_Shader(1),{
                color: hex_color("#AFFFFF"),//hex_color("#FFFFFF"),
                ambient: 0.5,
                diffusivity: 0.1,
                specularity: 0.1,
                smoothness: 64,
                color_texture: null,//new Texture("assets/grass_texture.jpg"),
                light_depth_texture: null
            }),

            game_over_texture: new Material(new Textured_Phong(),{
                color: hex_color("#000000"),
                ambient: 0.5,
                diffusivity: 0.1,
                specularity: 0.1,
                texture: new Texture("assets/game_over.png")
            }),

            rock_texture: new Material(new Textured_Phong(),{
                color: hex_color("#000000"),
                ambient: 0.5,
                diffusivity: 0.1,
                specularity: 0.1,
                texture: new Texture("assets/rock_texture.png")
            }),

            log_texture: new Material(new Textured_Phong(),{
                color: hex_color("#000000"),
                ambient: 0.5,
                diffusivity: 0.1,
                specularity: 0.1,
                texture: new Texture("assets/wood_log_texture.jpg")
            }),
            level1: new Material(new Textured_Phong(),{
                color: hex_color("#000000"),
                ambient: 0.5,
                diffusivity: 0.1,
                specularity: 0.1,
                texture: new Texture("assets/level1.png")
            }),

            level2: new Material(new Textured_Phong(),{
                color: hex_color("#000000"),
                ambient: 0.5,
                diffusivity: 0.1,
                specularity: 0.1,
                texture: new Texture("assets/level2.png")
            }),
            level3: new Material(new Textured_Phong(),{
                color: hex_color("#000000"),
                ambient: 0.5,
                diffusivity: 0.1,
                specularity: 0.1,
                texture: new Texture("assets/level3.jpg")
            }),
        };
        this.initial_camera_location = Mat4.translation(-10, 0, 0).times(Mat4.look_at(vec3(0, 5, 20), vec3(0, 5, 0), vec3(0, 1, 0)));
        

        // For the floor or other plain objects
        this.floor = new Material(new Shadow_Textured_Phong_Shader(1), {
            color: color(1, 1, 1, 1), ambient: .3, diffusivity: 0.6, specularity: 0.4, smoothness: 64,
            color_texture: null,
            light_depth_texture: null
        })
        // For the first pass
        this.pure = new Material(new Color_Phong_Shader(), {
        })
        // For light source
        this.light_src = new Material(new defs.Phong_Shader(), {
            color: color(1, 1, 1, 1), ambient: 1, diffusivity: 0, specularity: 0
        });
        // For depth texture display
        this.depth_tex =  new Material(new Depth_Texture_Shader_2D(), {
            color: color(0, 0, .0, 1),
            ambient: 1, diffusivity: 0, specularity: 0, texture: null
        });

        // To make sure texture initialization only does once
        this.init_ok = false;
    }



    texture_buffer_init(gl) {
        // Depth Texture
        this.lightDepthTexture = gl.createTexture();
        // Bind it to TinyGraphics
        this.light_depth_texture = new Buffered_Texture(this.lightDepthTexture);
        // this.stars.light_depth_texture = this.light_depth_texture
        this.floor.light_depth_texture = this.light_depth_texture

        this.lightDepthTextureSize = LIGHT_DEPTH_TEX_SIZE;
        gl.bindTexture(gl.TEXTURE_2D, this.lightDepthTexture);
        gl.texImage2D(
            gl.TEXTURE_2D,      // target
            0,                  // mip level
            gl.DEPTH_COMPONENT, // internal format
            this.lightDepthTextureSize,   // width
            this.lightDepthTextureSize,   // height
            0,                  // border
            gl.DEPTH_COMPONENT, // format
            gl.UNSIGNED_INT,    // type
            null);              // data
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // Depth Texture Buffer
        this.lightDepthFramebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.lightDepthFramebuffer);
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,       // target
            gl.DEPTH_ATTACHMENT,  // attachment point
            gl.TEXTURE_2D,        // texture target
            this.lightDepthTexture,         // texture
            0);                   // mip level
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // create a color texture of the same size as the depth texture
        // see article why this is needed_
        this.unusedTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.unusedTexture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            this.lightDepthTextureSize,
            this.lightDepthTextureSize,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            null,
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        // attach it to the framebuffer
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,        // target
            gl.COLOR_ATTACHMENT0,  // attachment point
            gl.TEXTURE_2D,         // texture target
            this.unusedTexture,         // texture
            0);                    // mip level
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }





    display(context, program_state) {
        

        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            //this.key_triggered_button("Right", ["d"], () => this.thrust[0] = -1, undefined, () => this.thrust[0] = 0);

            program_state.set_camera(Mat4.translation(5, -10, -30));
            //this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            //program_state.set_camera(Mat4.translation(5, -10, -30));
       }
        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, 1, 100);

        let t = this.time % 60;

        //hide light source from view
        if(this.gameOver)
        {
            this.light_position = vec4(0, -10, -5, 1);
            program_state.lights = [new Light(this.light_position, color(1, 1, 1, 1), 5)];
        }
        // *** Lights: *** Values of vector or point lights.
        else if(t >= 45) //draw "moon" cycle
        {
            this.light_position = vec4(10+(-17)*Math.cos(Math.PI*(t-45)/15), -6+21*Math.sin(Math.PI*(t-45)/15), -5, 1);
            program_state.lights = [new Light(this.light_position, color(1, 1, 1, 1), 5)];
        }
        else    //draw sun cycle
        {
            this.light_position = vec4(10+(-17)*Math.cos(Math.PI*t/45), -6+21*Math.sin(Math.PI*t/45), -5, 1);
            program_state.lights = [new Light(this.light_position, color(1, 1, 1, 1), 1000)];
        }

        // this.light_position = vec4(5, 5, -3, 1);
        //     program_state.lights = [new Light(this.light_position, color(1, 1, 1, 1), 1000)];

        
    }
}

export class project extends Base_Scene {


    make_control_panel() {
        this.key_triggered_button("jump", [" "], () => {
            if(this.startScreen)
            {
                this.startScreen = false;
                this.gameStartTime = this.time;
            }
            if(this.gameOver){
                this.game_time = 0; 
                this.startScreen = true;
                this.gameOver = false; 
            }
            if(!this.isJumping) //don't want to do a second jump if we are already jumping
                this.jumpStartTime = this.time;
            this.isJumping = true; 
        });
        this.key_triggered_button("crouch", ["Shift"], () => {
            this.isCrouching = !this.isCrouching;
        });
    }


    jump(model_transform, time){

        let x = 5 * (Math.sin(Math.PI*(time-this.jumpStartTime)/1.5));
        //model_transform  = model_transform.times( Mat4.rotation(x, 0, 0, -1 ) );
        model_transform  = model_transform.times( Mat4.translation(0, x, 0));
        if(model_transform[1][3] <= 0.01)
        	this.isJumping = false; 
        
        return model_transform;
    }

    crouch(model_transform)
    {
        return model_transform.times(Mat4.scale(0.5, 0.5, 0.5));
    }

    drawStartScreen(context, program_state)
    {
        let model_transform = Mat4.identity();

        const startTraslate = Mat4.translation(10, 7, -6.9);
        const startScreenScale = Mat4.scale(10, 6, 0.1);

        model_transform = model_transform.times(startTraslate).times(startScreenScale);

        this.shapes.cube.draw(context, program_state, model_transform, this.materials.start_texture);
    }

    drawDino(context, program_state, time, shadow_pass)
    {
        let model_transform = Mat4.identity();
        model_transform = model_transform

        if (this.isJumping)
            model_transform = this.jump(model_transform, time);
        
        const dinoRotation = Mat4.rotation(Math.PI/2, 0, 1, 0);

        if(this.isCrouching)
            model_transform = this.crouch(model_transform);
            
        model_transform = model_transform.times(dinoRotation); 
        model_transform = model_transform.times(Mat4.scale(2,2,2)).times(Mat4.translation(0, 1, 0)); //give the ball an appearance as if it is moving
        this.dino_transform = model_transform; 

        this.dinoPosition[0] = model_transform[0][3];   //get x position
        this.dinoPosition[1] = model_transform[1][3];   //get y positiom
        
        this.shapes.dino.draw(context, program_state, model_transform, shadow_pass? this.materials.dino : this.pure);
    }

    drawGrass(context, program_state, shadow_pass)
    {
      
        let model_transform = Mat4.identity();
        const grass = hex_color("#47F33B");
        
        const grassScale = Mat4.scale(20, 0.1, 6);
        const grassTranslation = Mat4.translation(10, -1, 0);

        model_transform = model_transform.times(grassTranslation).times(grassScale);

        this.shapes.cube.draw(context, program_state, model_transform, shadow_pass? this.materials.grass_texture: this.pure);
    }

    drawbackground(context, program_state, time)
    {
        let t = this.time; 
        let model_transform = Mat4.identity();
        // var sun_scale = 4 + Math.sin(t/3 - (Math.PI));
        
        const sky_scale = Mat4.scale(21, 9, 0.1);
        const sky_translation = Mat4.translation(10, 7.5, -7);

        model_transform = model_transform.times(sky_translation).times(sky_scale);


        //increase the red value
        let backgroundColor = color(
            Math.sin(Math.PI*t/10), 
            0, 
            0,
            1);
        //increase the green and blue values
        if(t % 60 >= 5)
        {
            backgroundColor = color(
                1, 
                (200/255.0)*Math.sin(Math.PI*t/10 - Math.PI/2), 
                Math.sin(Math.PI*t/10 - Math.PI/2),
                1);
        }
        //descrease the red value
        if(t % 60 >= 10)
        {
            backgroundColor = color(
                Math.sin(Math.PI*t/10 - Math.PI/2), 
                (200/255.0), 
                1,
                1);
        }

        //run full day 
        if(t % 60 >= 15)
        {
            backgroundColor = color(
                0, 
                (200/255.0), 
                1,
                1);
        }

        //start sunset
        //increase red value
        if(t % 60 >= 30)
        {
            backgroundColor = color(
                Math.sin(Math.PI*t/10 - Math.PI), 
                (200/255.0), 
                1,
                1);
        }
        
        //descrease the green and blue values
        if(t % 60 >= 35)
        {
            backgroundColor = color(
                1, 
                (200/255.0)*Math.sin(Math.PI*t/10 - Math.PI), 
                Math.sin(Math.PI*t/10 - Math.PI),
                1);
        }

        //descrease the red value
        if(t % 60 >= 40)
        {
            backgroundColor = color(
                Math.sin(Math.PI*t/10 - 3*Math.PI/2), 
                0, 
                0,
                1);
        }

        //run full night
        if(time % 60 >= 45)
            backgroundColor = color(0, 0, 0, 1);

        this.shapes.cube.draw(context, program_state, model_transform, this.materials.plastic.override({color: backgroundColor}));
    }

    drawObstacles(context, program_state, time)
    {
        let rock_transform1 = Mat4.identity().times(Mat4.translation(28,3.5,0));
        let rock_transform2 = Mat4.identity().times(Mat4.translation(28,4,0));

        let model_transform2 = Mat4.identity().times(Mat4.translation(28,0,0)).times(Mat4.scale(0.8,1,6 ));
        let model_transform3 = Mat4.identity().times(Mat4.translation(28,0,0)).times(Mat4.scale(0.8,1,6 ));
        let model_transform4 = Mat4.identity().times(Mat4.translation(28,0,0)).times(Mat4.scale(0.8,1,6 ));
        let model_transform5 = Mat4.identity().times(Mat4.translation(28,0,0)).times(Mat4.scale(0.8,1,6 ));

        
        let h = 2.5; //can change speed with score using h

        let t = -24+24*Math.cos(time/h);
        let t2 =-24-24*Math.cos(time/h);
        let t3 =-24+24*Math.cos(time/h + 1.5);
        let t4 =-24-24*Math.cos(time/h +1.5);
                
        let r = -24+24*Math.cos(time/-2.5);
        //move the logs across the screen
        model_transform2 = model_transform2.times(Mat4.translation(t,0,0)); 
        model_transform3 = model_transform3.times(Mat4.translation(t2,0,0)); 
        model_transform4 = model_transform4.times(Mat4.translation(t3,0,0));
        model_transform5 = model_transform5.times(Mat4.translation(t4,0,0));

        //rotate the logs
        model_transform2 = model_transform2.times(Mat4.rotation(Math.PI * time, 0, 0, 1));
        model_transform3 = model_transform3.times(Mat4.rotation(Math.PI * time, 0, 0, 1));
        model_transform4 = model_transform4.times(Mat4.rotation(Math.PI * time, 0, 0, 1));
        model_transform5 = model_transform5.times(Mat4.rotation(Math.PI * time, 0, 0, 1));

        //move the rocks across the screen
        rock_transform1 = rock_transform1.times(Mat4.translation(-24-24*Math.cos(time/h),0,0)); 
        rock_transform2 = rock_transform2.times(Mat4.translation(-24+24*Math.cos(time/h+ 1.5),0,0)); 

        this.obstacles_model_transform_vector[0] = model_transform2;
        this.obstacles_model_transform_vector[1] = model_transform3;
        this.obstacles_model_transform_vector[2] = model_transform4;
        this.obstacles_model_transform_vector[3] = model_transform5;

        this.rock_transform_vector[0] = rock_transform1;
        this.rock_transform_vector[1] = rock_transform2;
        
        let len = this.obstacles_model_transform_vector.length;
        let len2 = this.rock_transform_vector.length;

        for(let i = 0; i < len; i++)
        {
            this.obstacles_is_showing_vector[i] = false;
        }

        for(let i = 0; i < len2; i++)
        {
            this.rock_is_showing_vector[i] = false;
        }

        if (-(24/2.5)*Math.sin(time/h) <= 0 )
        {
            this.shapes.cube.draw(context,program_state,model_transform2,this.materials.log_texture);
            this.obstacles_is_showing_vector[0] = true;
        }
        //rock
        else{
            this.shapes.sphere.draw(context,program_state,rock_transform1,this.materials.rock_texture);
            this.rock_is_showing_vector[0] = true;
        }

        if ((24/2.5)*Math.sin(time/h) <= 0 )
        {
             this.shapes.cube.draw(context,program_state,model_transform3,this.materials.log_texture);
             this.obstacles_is_showing_vector[1] = true;
        }


        if (-(24/2.5)*Math.sin(time/h+1.5) <= 0 )
        {
             this.shapes.cube.draw(context,program_state,model_transform4,this.materials.log_texture);
             this.obstacles_is_showing_vector[2] = true;
        }
        if ((24/2.5)*Math.sin(time/h+1.5) <= 0 )
        {
            this.shapes.cube.draw(context,program_state,model_transform5,this.materials.log_texture);
            this.obstacles_is_showing_vector[3] = true;
        }
        //rock 
        else{
            this.shapes.sphere.draw(context,program_state,rock_transform2,this.materials.rock_texture);
            this.rock_is_showing_vector[1] = true;
        }

    }

    //returns true if dino collides with anything
    //returns false otherwise
    checkForCollision()
    {
        const len = this.obstacles_model_transform_vector.length;
        for(let i = 0; i < len; i++)
        {
            //check x positions
            if(this.obstacles_model_transform_vector[i][0][3] >= -2 && this.obstacles_model_transform_vector[i][0][3] <= 2
                && this.obstacles_is_showing_vector[i] && this.dinoPosition[1] <= 2.1){
                return true;
            }
        }

        const len2 = this.rock_transform_vector.length;
        for(let i = 0; i < len2; i++)
        {
            // for rock check y positon of dinosaur
            if (this.rock_transform_vector[i][0][3] >= -0.3 && this.rock_transform_vector[i][0][3] <= 1.5 && 
                this.rock_is_showing_vector[i] && !this.isCrouching){
                return true;
            }
        }

        return false;
    }

    drawGameOver(context, program_state)
    {
        let model_transform = Mat4.identity();

        const traslate = Mat4.translation(10, 5, -6.9);
        const scale = Mat4.scale(20, 12, 0.1);

        model_transform = model_transform.times(traslate).times(scale);

        this.shapes.cube.draw(context, program_state, model_transform, this.materials.game_over_texture);
    }

    drawlevel(context, program_state){

        let model_transform = Mat4.identity();

        const startTraslate = Mat4.translation(10, 17, 1);
        const startScreenScale = Mat4.scale(10, 6, 0.1);

        model_transform = model_transform.times(Mat4.translation(17, 9, 1)).times(Mat4.translation(2,2,.1)).times((Mat4.scale(2,1,.1))); 


        if (this.level == 1){
            this.shapes.cube.draw(context, program_state, model_transform, this.materials.level1);
        }

        if (this.level == 2){
            this.shapes.cube.draw(context, program_state, model_transform, this.materials.level2);
        }
        if (this.level == 3){
            this.shapes.cube.draw(context, program_state, model_transform, this.materials.level3);
        }
    }

    render_scene(context, program_state, shadow_pass, draw_light_source=false, draw_shadow=false) {
        // shadow_pass: true if this is the second pass that draw the shadow.
        // draw_light_source: true if we want to draw the light source.
        // draw_shadow: true if we want to draw the shadow

        let light_position = this.light_position;
        let light_color = this.light_color;
        const t = program_state.animation_time;

        program_state.draw_shadow = draw_shadow;

        if (draw_light_source && shadow_pass) {
            this.shapes.sphere.draw(context, program_state,
                Mat4.translation(light_position[0], light_position[1], light_position[2]), this.light_src);
        }
        this.drawDino(context, program_state, t, shadow_pass);

        this.drawGrass(context, program_state, shadow_pass); 

        // for (let i of [-1, 1]) { // Spin the 3D model shapes as well.
        //     const model_transform = Mat4.translation(2 * i, 3, 0)
        //         .times(Mat4.rotation(t / 1000, -1, 2, 0))
        //         .times(Mat4.rotation(-Math.PI / 2, 1, 0, 0));
        //     this.shapes.teapot.draw(context, program_state, model_transform, shadow_pass? this.stars : this.pure);
        // }

        // let model_trans_floor = Mat4.scale(8, 0.1, 5);
        // let model_trans_ball_0 = Mat4.translation(0, 1, 0);
        // let model_trans_ball_1 = Mat4.translation(5, 1, 0);
        // let model_trans_ball_2 = Mat4.translation(-5, 1, 0);
        // let model_trans_ball_3 = Mat4.translation(0, 1, 3);
        // let model_trans_ball_4 = Mat4.translation(0, 1, -3);
        // let model_trans_wall_1 = Mat4.translation(-8, 2 - 0.1, 0).times(Mat4.scale(0.33, 2, 5));
        // let model_trans_wall_2 = Mat4.translation(+8, 2 - 0.1, 0).times(Mat4.scale(0.33, 2, 5));
        // let model_trans_wall_3 = Mat4.translation(0, 2 - 0.1, -5).times(Mat4.scale(8, 2, 0.33));
        // this.shapes.cube.draw(context, program_state, model_trans_floor, shadow_pass? this.floor : this.pure);
        // this.shapes.cube.draw(context, program_state, model_trans_wall_1, shadow_pass? this.floor : this.pure);
        // this.shapes.cube.draw(context, program_state, model_trans_wall_2, shadow_pass? this.floor : this.pure);
        // this.shapes.cube.draw(context, program_state, model_trans_wall_3, shadow_pass? this.floor : this.pure);
        // this.shapes.sphere.draw(context, program_state, model_trans_ball_0, shadow_pass? this.floor : this.pure);
        // this.shapes.sphere.draw(context, program_state, model_trans_ball_1, shadow_pass? this.floor : this.pure);
        // this.shapes.sphere.draw(context, program_state, model_trans_ball_2, shadow_pass? this.floor : this.pure);
        // this.shapes.sphere.draw(context, program_state, model_trans_ball_3, shadow_pass? this.floor : this.pure);
        // this.shapes.sphere.draw(context, program_state, model_trans_ball_4, shadow_pass? this.floor : this.pure);
    }
    

    display(context, program_state) {
        super.display(context, program_state); // <- commenting out this line of code will result in program crashing

        program_state.set_camera(this.initial_camera_location);
        const time = this.time = program_state.animation_time / 1000;
        const gl = context.context;

        if (!this.init_ok) {
            const ext = gl.getExtension('WEBGL_depth_texture');
            if (!ext) {
                return alert('need WEBGL_depth_texture');  // eslint-disable-line
            }
            this.texture_buffer_init(gl);

            this.init_ok = true;
        }

        this.light_view_target = vec4(0, 0, 0, 1);
        this.light_field_of_view = 130 * Math.PI / 180; // 130 degree

        

        // Step 1: set the perspective and camera to the POV of light
        const light_view_mat = Mat4.look_at(
            vec3(this.light_position[0], this.light_position[1], this.light_position[2]),
            vec3(this.light_view_target[0], this.light_view_target[1], this.light_view_target[2]),
            vec3(0, 1, 0), // assume the light to target will have a up dir of +y, maybe need to change according to your case
        );
        const light_proj_mat = Mat4.perspective(this.light_field_of_view, 1, 0.5, 500);
        // Bind the Depth Texture Buffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.lightDepthFramebuffer);
        gl.viewport(0, 0, this.lightDepthTextureSize, this.lightDepthTextureSize);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // Prepare uniforms
        program_state.light_view_mat = light_view_mat;
        program_state.light_proj_mat = light_proj_mat;
        program_state.light_tex_mat = light_proj_mat;
        program_state.view_mat = light_view_mat;
        program_state.projection_transform = light_proj_mat;
        this.render_scene(context, program_state, false,false, false);

        // Step 2: unbind, draw to the canvas
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        program_state.view_mat = program_state.camera_inverse;
        program_state.projection_transform = Mat4.perspective(Math.PI / 4, context.width / context.height, 0.5, 500);
        this.render_scene(context, program_state, true,true, true);
        
        this.game_time += 1/20; 

        // console.log(this.game_time);

        // if (this.game_time < 50){
        //     this.level = 1; 
        //     this.drawlevel(context, program_state);
        // }

        // if (this.game_time > 50){
        //     this.level = 2; 
        //     this.drawlevel(context, program_state);
        // }

        // if (this.game_time > 100){
        //     this.level = 3; 
        //     this.drawlevel(context, program_state);
        // }


        if (this.isCrouching){
            this.crouch_timer += 1; 
            if (this.crouch_timer == 70){
                this.crouch(this.dino_transform); 
                this.isCrouching = false; 
                this.crouch_timer = 0; 
            }
        }
        
        if(this.startScreen)
        {
            // this.drawDino(context, program_state, time);
            // this.drawStartScreen(context, program_state);
            // this.drawGrass(context, program_state); 
            // this.drawbackground(context, program_state, time); 
        }
        else if(!this.gameOver)
        {
            this.drawObstacles(context, program_state, time);
            this.drawGrass(context, program_state); 
            this.drawbackground(context, program_state, time); 
            this.drawDino(context, program_state, time);
        }
        else
        {
            this.drawGameOver(context, program_state);
        }

        //don't want to be forced into clipping a log off the initial jump
        if(this.time - this.gameStartTime >= 2.5 && this.checkForCollision())    //want to be put into a game over state
        {
            this.gameOver = true;
        }
    }
} 