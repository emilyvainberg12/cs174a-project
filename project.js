import {defs, tiny} from './common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Matrix, Mat4, Light, Shape, Material, Scene,
} = tiny;

class Cube extends Shape {
    constructor() {
        super("position", "normal",);
        // Loop 3 times (for each axis), and inside loop twice (for opposing cube sides):
        this.arrays.position = Vector3.cast(
            [-1, -1, -1], [1, -1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, -1], [-1, 1, -1], [1, 1, 1], [-1, 1, 1],
            [-1, -1, -1], [-1, -1, 1], [-1, 1, -1], [-1, 1, 1], [1, -1, 1], [1, -1, -1], [1, 1, 1], [1, 1, -1],
            [-1, -1, 1], [1, -1, 1], [-1, 1, 1], [1, 1, 1], [1, -1, -1], [-1, -1, -1], [1, 1, -1], [-1, 1, -1]);
        this.arrays.normal = Vector3.cast(
            [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0],
            [-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0],
            [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1]);
        // Arrange the vertices into a square shape in texture space too:
        this.indices.push(0, 1, 2, 1, 3, 2, 4, 5, 6, 5, 7, 6, 8, 9, 10, 9, 11, 10, 12, 13,
            14, 13, 15, 14, 16, 17, 18, 17, 19, 18, 20, 21, 22, 21, 23, 22);
    }
}


class Base_Scene extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();
        this.isJumping = false;

        this.jumpStartTime = 0;
        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            'cube': new Cube(),
            
            sphere: new defs.Subdivision_Sphere(3), //using 3 subdivisions so that you can see the rotation of the sphere
        };

        // *** Materials
        this.materials = {
            plastic: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
            test: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
        };

        this.initial_camera_location = Mat4.translation(-10, 0, 0).times(Mat4.look_at(vec3(0, 5, 20), vec3(0, 5, 0), vec3(0, 1, 0)));
    }

    display(context, program_state) {
        

        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            //this.key_triggered_button("Right", ["d"], () => this.thrust[0] = -1, undefined, () => this.thrust[0] = 0);

            program_state.set_camera(Mat4.translation(5, -10, -30));
       }
        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, 1, 100);

        // *** Lights: *** Values of vector or point lights.
        const light_position = vec4(0, 7, 5, 1);
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)];
    }
}

export class project extends Base_Scene {

    make_control_panel() {
        this.key_triggered_button("jump", [" "], () => {
            if(!this.isJumping) //don't want to do a second jump if we are already jumping
                this.jumpStartTime = this.time;
            this.isJumping = true;
        });

        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        //this.key_triggered_button("Right", ["d"], () => this.thrust[0] = -1, undefined, () => this.thrust[0] = 0);
       // this.key_triggered_button("Change Colors", ["c"], this.set_colors);

        
        //this.key_triggered_button("Right", ["d"], () => this.thrust[0] = -1, undefined, () => this.thrust[0] = 0);
        // Add a button for controlling the scene.

        //this.key_triggered_button("Sit still", ["m"], () => {
            // TODO:  Requirement 3d:  Set a flag here that will toggle your swaying motion on and off.
       // });
    }

    jump(program_state, model_transform, time){
//         const time = this.t = program_state.animation_time / 1000;

        var x = 7 * (Math.sin(Math.PI*(time-this.jumpStartTime)));
        //model_transform  = model_transform.times( Mat4.rotation(x, 0, 0, -1 ) );
        model_transform  = model_transform.times( Mat4.translation(0, x, 0));
        
        if(model_transform[1][3] <= 0.01)
        	this.isJumping = false; 
        
        return model_transform;
    }

    drawDino(context, program_state, time)
    {
        const blue = hex_color("#1a9ffa");
        let model_transform = Mat4.identity();

        if (this.isJumping)
            model_transform = this.jump(program_state, model_transform, time);
        
        const dinoRotation = Mat4.rotation(-time*5, 0, 0, 1);
        const dinoTranslation = Mat4.translation(0, 0, 0);
            
        model_transform = model_transform.times(dinoTranslation).times(dinoRotation); //give the ball an appearance as if it is moving

        
        this.shapes.sphere.draw(context, program_state, model_transform, this.materials.test.override({color:blue}));
    }

    drawGrass(context, program_state)
    {
      
        let model_transform = Mat4.identity();
        const grass = hex_color("#47F33B");
        
        const grassScale = Mat4.scale(20, 0.1, 6);
        const grassTranslation = Mat4.translation(10, -1, 0);

        model_transform = model_transform.times(grassTranslation).times(grassScale);

        this.shapes.cube.draw(context, program_state, model_transform, this.materials.plastic.override({color: grass}));
    }

    drawbackground(context, program_state, time)
    {
        let t = time; 
        console.log(t)
        let model_transform = Mat4.identity();
        var sun_scale = 4 + Math.sin(t/3 - (Math.PI));
        // var sun_scale = 5 + Math.sin(t *0.9 - (Math.PI * 3));
        
        const sky_scale = Mat4.scale(20, 4.66, 5);
        const sky_translation = Mat4.translation(10, 6, -1);


        model_transform = model_transform.times(sky_translation).times(sky_scale);
        this.shapes.cube.draw(context, program_state, model_transform, this.materials.plastic.override({color: color(1, -0.5 + 0.5 * sun_scale, -0.5 + 0.5 * sun_scale, 1)}));
    }

    draw_box(context, program_state, model_transform) {
        // TODO:  Helper function for requirement 3 (see hint).
        //        This should make changes to the model_transform matrix, draw the next box, and return the newest model_transform.
        // Hint:  You can add more parameters for this function, like the desired color, index of the box, etc.

        return model_transform;
    }

    display(context, program_state) {
        super.display(context, program_state); // <- commenting out this line of code will result in program crashing
        

        if (!context.scratchpad.controls) {
            //this.children.push(context.scratchpad.controls = new defs.Movement_Controls()); <- we don't need the camera controls
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }

        const time = this.time = program_state.animation_time / 1000;
        
        

        this.drawGrass(context, program_state); 

        this.drawbackground(context, program_state, time); 

        this.drawDino(context, program_state, time);


        
    }
} 