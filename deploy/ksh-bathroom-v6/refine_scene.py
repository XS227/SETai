import bpy,math
from mathutils import Vector
s=bpy.context.scene
# Match the supplied product reference: right-set round Zone basin.
for o in bpy.data.objects:
 if o.name.startswith(('White oval','Basin drain','Black tap')):o.location.x+=.27
bowl=bpy.data.objects.get('White oval basin · opening faces UP')
for v in bowl.data.vertices:v.co.x/=1.23;v.co.y=.255+(v.co.y-.255)/.86
# Framing includes the floating cabinet, its underside, and the surrounding room.
cam=s.camera;cam.data.lens=38
cam.animation_data_clear()
for frame,loc,target in [(1,(1.8,-2.8,1.52),(0,.24,1.09)),(73,(1.35,-2.65,1.48),(0,.24,1.09)),(145,(.9,-2.5,1.44),(0,.24,1.09))]:
 cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.keyframe_insert('location',frame=frame);cam.keyframe_insert('rotation_euler',frame=frame)
for light in [o for o in bpy.data.objects if o.type=='LIGHT']:
 if hasattr(light,'visible_glossy'):light.visible_glossy=False
# Mirror uses a softer architectural reflection; avoid hard white lamp discs.
mirror=bpy.data.materials.get('Mirror silver');mirror.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.23
s.render.resolution_percentage=60
for frame in (1,73,145):
 s.frame_set(frame);t=artifacts.file(name='vedum-check-%03d.png'%frame,media_type='image/png');s.render.image_settings.media_type='IMAGE';s.render.image_settings.file_format='PNG';s.render.filepath=str(t.path);bpy.ops.render.render(write_still=True);t.publish()
result={'frames_checked':[1,73,145],'basin_position':'right','lens_mm':cam.data.lens}
