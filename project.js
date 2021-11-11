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
        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            'cube': new Cube(),
            
        };

        // *** Materials
        this.materials = {
            plastic: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
        };
    }

    display(context, program_state) {
        

        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            //this.key_triggered_button("Right", ["d"], () => this.thrust[0] = -1, undefined, () => this.thrust[0] = 0);

            //this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(Mat4.translation(5, -10, -30));
       }
        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, 1, 100);

        // *** Lights: *** Values of vector or point lights.
        const light_position = vec4(0, 5, 5, 1);
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)];
    }
}

export class project extends Base_Scene {

    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            torus: new defs.Torus(15, 15),
            torus2: new defs.Torus(3, 15),
            sphere: new defs.Subdivision_Sphere(4),
            circle: new defs.Regular_2D_Polygon(1, 15),
        };

        // *** Materials
        this.materials = {
            test: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 10, 20), vec3(10, 5, 0), vec3(0, 1, 0));
    }

    make_control_panel() {
        this.key_triggered_button("jump", [" "], () => {this.isJumping = true});

        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        //this.key_triggered_button("Right", ["d"], () => this.thrust[0] = -1, undefined, () => this.thrust[0] = 0);
       // this.key_triggered_button("Change Colors", ["c"], this.set_colors);

        
        //this.key_triggered_button("Right", ["d"], () => this.thrust[0] = -1, undefined, () => this.thrust[0] = 0);
        // Add a button for controlling the scene.

        //this.key_triggered_button("Sit still", ["m"], () => {
            // TODO:  Requirement 3d:  Set a flag here that will toggle your swaying motion on and off.
       // });
    }

    jump(program_state, model_transform){
        const t = this.t = program_state.animation_time / 1000;
        var x = 4 * (Math.sin(Math.PI*t) + 1);
        //model_transform  = model_transform.times( Mat4.rotation(x, 0, 0, -1 ) );
        model_transform  = model_transform.times( Mat4.translation(0, x, 0));


        
        if(model_transform[1][3] <= 0.01)
        	this.isJumping = false; 
        
        return model_transform;
    }

    draw_box(context, program_state, model_transform) {
        // TODO:  Helper function for requirement 3 (see hint).
        //        This should make changes to the model_transform matrix, draw the next box, and return the newest model_transform.
        // Hint:  You can add more parameters for this function, like the desired color, index of the box, etc.

        return model_transform;
    }

    display(context, program_state) {
        super.display(context, program_state); // <- commenting out this line of code will result in program crashing
        const blue = hex_color("#1a9ffa");
        let model_transform = Mat4.identity();

        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }


        // Example for drawing a cube, you can remove this line if needed
        if (this.isJumping)
            model_transform = this.jump(program_state, model_transform);
            
        
        this.shapes.sphere.draw(context, program_state, model_transform, this.materials.test.override({color:blue}));
        // TODO:  Draw your entire scene here.  Use this.draw_box( graphics_state, model_transform ) to call your helper.
    }
} 